// A conservative extractor for SELECT statements. Unsupported constructs are surfaced for review.
export function splitTopLevel(input, separator = ',') {
  const out = []; let start = 0, depth = 0, quote = '', comment = '';
  for (let i = 0; i < input.length; i++) {
    const c = input[i], n = input[i + 1];
    if (comment === 'line') { if (c === '\n') comment = ''; continue; }
    if (comment === 'block') { if (c === '*' && n === '/') { comment = ''; i++; } continue; }
    if (quote) { if (c === quote) { if (n === quote) i++; else quote = ''; } else if (c === '\\') i++; continue; }
    if (c === '-' && n === '-') { comment = 'line'; i++; continue; }
    if (c === '/' && n === '*') { comment = 'block'; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '(') depth++;
    if (c === ')') depth = Math.max(0, depth - 1);
    if (!depth && c === separator) { out.push({text:input.slice(start,i),offset:start}); start=i+1; }
  }
  out.push({text:input.slice(start),offset:start}); return out;
}
function words(sql) {
  const list=[]; let quote='', comment='', depth=0;
  for(let i=0;i<sql.length;i++) {
    const c=sql[i],n=sql[i+1];
    if(comment==='line'){if(c==='\n')comment='';continue;}
    if(comment==='block'){if(c==='*'&&n==='/'){comment='';i++;}continue;}
    if(quote){if(c===quote){if(n===quote)i++;else quote='';}else if(c==='\\')i++;continue;}
    if(c==='-'&&n==='-'){comment='line';i++;continue;}
    if(c==='/'&&n==='*'){comment='block';i++;continue;}
    if(c==="'"||c==='"'||c==='`'){quote=c;continue;}
    if(c==='('){depth++;continue;} if(c===')'){depth=Math.max(0,depth-1);continue;}
    if(/[A-Za-z_]/.test(c)){let j=i+1;while(j<sql.length&&/[\w$]/.test(sql[j]))j++;list.push({word:sql.slice(i,j).toUpperCase(),start:i,end:j,depth});i=j-1;}
  } return list;
}
const lineAt=(sql,index)=>1+(sql.slice(0,index).match(/\n/g)||[]).length;
const trimRange=(s,start,end)=>{while(start<end&&/\s/.test(s[start]))start++;while(end>start&&/\s/.test(s[end-1]))end--;return {text:s.slice(start,end),start,end};};
function clauses(sql) {
 const w=words(sql).filter(x=>x.depth===0), pairs=[];
 for(let i=0;i<w.length;i++) {
  let name=w[i].word, end=w[i].end;
  if(['GROUP','ORDER'].includes(name)&&w[i+1]?.word==='BY'){end=w[++i].end;name+=' BY';}
  if(['SELECT','FROM','WHERE','GROUP BY','HAVING','ORDER BY','LIMIT'].includes(name))pairs.push({name,start:w[i].start,end});
 }
 return pairs.map((p,i)=>({...p,value:trimRange(sql,p.end,pairs[i+1]?.start??sql.length)}));
}
function caseBranches(expr,offset,sql,field){
 const ww=words(expr), cases=[];
 for(let i=0;i<ww.length;i++)if(ww[i].word==='CASE'){
  let level=1, end=i+1;for(;end<ww.length;end++){if(ww[end].word==='CASE')level++;if(ww[end].word==='END'&&!--level)break;}
  if(end===ww.length)continue;
  const inner=ww.slice(i+1,end); let boundaries=[];let nested=0;
  for(const t of inner){if(t.word==='CASE')nested++;else if(t.word==='END')nested--;else if(!nested&&['WHEN','THEN','ELSE'].includes(t.word))boundaries.push(t);}
  const lead=expr.slice(ww[i].end,boundaries[0]?.start??ww[end].start).trim();
  for(let k=0;k<boundaries.length;k++){
   const b=boundaries[k];if(b.word!=='WHEN'&&b.word!=='ELSE')continue;
   const next=boundaries[k+1], next2=boundaries[k+2];
   if(b.word==='WHEN'&&next?.word==='THEN'){
    const condition=expr.slice(b.end,next.start).trim(); const stop=(next2?.word==='WHEN'||next2?.word==='ELSE')?next2.start:ww[end].start;
    const result=expr.slice(next.end,stop).trim();
    cases.push({field,kind:'CASE WHEN',condition:lead?`${lead} = ${condition}`:condition,result,sourceStart:offset+b.start,sourceEnd:offset+stop,sourceLine:lineAt(sql,offset+b.start)});
   }else if(b.word==='ELSE'){
    cases.push({field,kind:'CASE ELSE',condition:'其余情况',result:expr.slice(b.end,ww[end].start).trim(),sourceStart:offset+b.start,sourceEnd:offset+ww[end].start,sourceLine:lineAt(sql,offset+b.start)});
   }
  }i=end;
 }return cases;
}
export function extractRules(sql){
 if(typeof sql!=='string'||sql.length>100000)throw Error('SQL 需为文本，且不能超过 100,000 字符。');
 if (words(sql).some(w=>w.depth===0&&['UNION','INTERSECT','EXCEPT'].includes(w.word))) throw Error('集合查询请拆成单个 SELECT 后分别解析。');
 const cs=clauses(sql), sel=cs.find(x=>x.name==='SELECT'), from=cs.find(x=>x.name==='FROM');
 if(!sel||!from||from.start<=sel.start)throw Error('目前支持带 FROM 的 SELECT 查询，请检查 SQL。');
 const warnings=[];
 if (/\bWITH\b/i.test(sql.slice(0,sel.start))) warnings.push('CTE 中的规则未展开；仅提取最外层 SELECT，请核对上游定义。');
 if (/\bOVER\s*\(/i.test(sql)) warnings.push('窗口函数仅显示表达式，未解析分区和排序语义。');
 if ((words(sql).filter(w=>w.word==='SELECT')).length>1) warnings.push('存在嵌套 SELECT；只解析最外层，请人工检查子查询。');
 const rules=[];
 for(const part of splitTopLevel(sel.value.text)){
  const r=trimRange(sel.value.text,part.offset,part.offset+part.text.length);if(!r.text)continue;
  const absolute=sel.value.start+r.start, aliasMatch=r.text.match(/\s+AS\s+([\w"`]+)\s*$/i);
  const alias=aliasMatch?.[1].replace(/["`]/g,'') || r.text.match(/\s+([A-Za-z_]\w*)\s*$/)?.[1] || r.text;
  const expr=aliasMatch?r.text.slice(0,aliasMatch.index).trim():r.text;
  const branches=caseBranches(expr,absolute,sql,alias);
  if(branches.length)rules.push(...branches);
  else rules.push({field:alias,kind:'SELECT 字段',condition:'',result:expr,sourceStart:absolute,sourceEnd:absolute+r.text.length,sourceLine:lineAt(sql,absolute)});
 }
 const where=cs.find(x=>x.name==='WHERE');if(where)rules.push({field:'全局过滤',kind:'WHERE',condition:where.value.text,result:'保留符合条件的记录',sourceStart:where.start,sourceEnd:where.value.end,sourceLine:lineAt(sql,where.start)});
 const joins=[...from.value.text.matchAll(/\b(?:LEFT|RIGHT|FULL|INNER|CROSS)?\s*JOIN\s+([\w."`]+)(?:\s+(\w+))?\s+ON\s+([\s\S]*?)(?=\b(?:LEFT|RIGHT|FULL|INNER|CROSS)?\s*JOIN\b|$)/gi)];
 for(const m of joins){const start=from.value.start+m.index;rules.push({field:m[1],kind:'JOIN',condition:m[3].trim(),result:'关联数据表',sourceStart:start,sourceEnd:start+m[0].length,sourceLine:lineAt(sql,start)});}
 for(const c of cs.filter(x=>['GROUP BY','HAVING','ORDER BY'].includes(x.name)))rules.push({field:c.name,kind:c.name,condition:c.value.text,result:'',sourceStart:c.start,sourceEnd:c.value.end,sourceLine:lineAt(sql,c.start)});
 if(!rules.length)warnings.push('未能提取字段，请人工检查 SQL 方言与语法。');
 return {rules:rules.map((r,i)=>({...r,id:`r${i+1}`,meaning:'',status:'待确认'})),warnings};
}
