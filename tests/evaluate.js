import {extractRules} from '../parser.js';
const cases=[
['simple field','SELECT id FROM demo',1],
['two fields','SELECT id, amount FROM demo',2],
['aliases','SELECT p.id AS policy_id, p.code AS risk_code FROM demo p',2],
['literal comma',"SELECT 'a,b' AS label FROM demo",1],
['function comma',"SELECT COALESCE(a,b) AS combined FROM demo",1],
['simple CASE',"SELECT CASE WHEN x=1 THEN 'A' ELSE 'B' END AS bucket FROM demo",2],
['two WHEN',"SELECT CASE WHEN x=1 THEN 'A' WHEN x=2 THEN 'B' ELSE 'C' END AS bucket FROM demo",3],
['simple CASE expression',"SELECT CASE status WHEN 'A' THEN 'active' ELSE 'other' END AS state FROM demo",2],
['CASE without ELSE',"SELECT CASE WHEN x>0 THEN 1 END AS positive FROM demo",1],
['two CASE fields',"SELECT CASE WHEN a=1 THEN 'Y' ELSE 'N' END AS a_flag, CASE WHEN b=1 THEN 'Y' END AS b_flag FROM demo",3],
['WHERE',"SELECT id FROM demo WHERE active = 1",2],
['JOIN',"SELECT a.id FROM demo a JOIN lookup b ON a.k = b.k",2],
['two JOIN',"SELECT a.id FROM demo a LEFT JOIN b ON a.b=b.id INNER JOIN c ON a.c=c.id",3],
['GROUP and HAVING',"SELECT city, COUNT(*) AS n FROM demo GROUP BY city HAVING COUNT(*) > 2",4],
['ORDER',"SELECT id FROM demo ORDER BY id DESC",2],
['comments',"SELECT -- source\n x AS id FROM demo",1],
['quoted keyword',"SELECT 'FROM UNION' AS text FROM demo",1],
['multi line',"SELECT\n CASE\n WHEN x > 0 THEN 'Y'\n ELSE 'N' END AS flag\n FROM demo",2],
['CTE warning',"WITH c AS (SELECT id FROM raw) SELECT id FROM c",1,'CTE'],
['window warning',"SELECT ROW_NUMBER() OVER (PARTITION BY city ORDER BY id) AS rn FROM demo",1,'窗口'],
];
let pass=0;for(const [name,sql,expected,warning] of cases){try{let result=extractRules(sql);let okay=result.rules.length===expected&&(!warning||result.warnings.some(x=>x.includes(warning)));console.log(`${okay?'PASS':'FAIL'} ${name}: ${result.rules.length}/${expected}${warning?' warning='+result.warnings.join('|'):''}`);if(okay)pass++}catch(e){console.log(`FAIL ${name}: ${e.message}`)}}
console.log(`Coverage: ${pass}/${cases.length} synthetic scenarios`);if(pass!==cases.length)process.exitCode=1;
