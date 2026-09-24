import test from 'node:test';import assert from 'node:assert/strict';import {extractRules,splitTopLevel} from '../parser.js';
test('function and literal commas do not split fields',()=>assert.equal(splitTopLevel("COALESCE(a,b) AS x, 'a,b' AS y").length,2));
test('CASE branches preserve source and values',()=>{let sql="SELECT CASE WHEN x = 1 THEN 'yes' WHEN x = 2 THEN 'maybe' ELSE 'no' END AS label FROM demo WHERE active = 1";let {rules}=extractRules(sql);assert.deepEqual(rules.filter(r=>r.kind.startsWith('CASE')).map(r=>r.result),["'yes'","'maybe'","'no'"]);assert.equal(sql.slice(rules[0].sourceStart,rules[0].sourceEnd).startsWith('WHEN'),true);assert.equal(rules.at(-1).kind,'WHERE')});
test('does not invent semantics',()=>{let {rules}=extractRules('SELECT premium AS premium FROM demo');assert.equal(rules[0].meaning,'');assert.equal(rules[0].status,'待确认')});
test('extracts joins',()=>assert.equal(extractRules('SELECT COALESCE(a.x,0) AS amount FROM demo a LEFT JOIN lookup b ON a.k = b.k').rules.filter(r=>r.kind==='JOIN').length,1));
test('rejects unsupported input',()=>assert.throws(()=>extractRules('DELETE FROM demo'),/SELECT/));
