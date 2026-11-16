import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPptxParts} from '../src/native-client/local-pptx-extraction.mjs';
import {readOfficeZipParts} from '../src/native-client/local-ooxml-container.mjs';
import {realPptx,imageOnlyPptx,mixedPptx} from './support/office-pptx-fixtures.mjs';
const bytes=text=>new TextEncoder().encode(text),decode=value=>new TextDecoder().decode(value),code=expected=>error=>error.code===expected;
test('genuine reordered PPTX extracts Unicode, paragraphs, grouped shapes and true table cells',async()=>{
 const parts=await readOfficeZipParts(realPptx()),result=extractPptxParts(parts);
 assert.equal(result.format,'pptx');assert.equal(result.parser.name,'site-ooxml-presentationml');assert.equal(result.parser.xml.version,'0.8.15');assert.equal(result.totalPages,3);assert.equal(result.processedPages,3);assert.equal(result.partial,false);assert.equal(result.ocr,false);
 for(const marker of ['PPTX-GROUP-TEXT 嵌套文字','PPTX-NESTED-GROUP-END','PPTX-PARAGRAPH-02 BOLD-RUN café naïve Ω','PPTX-SOFT-LINE-1\nPPTX-SOFT-LINE-2','PPTX-EXTERNAL-LINK-TEXT','PPTX-TABLE-A\t中文单元格\t123.45','PPTX-TABLE-END'])assert.ok(result.text.includes(marker),marker);
 assert.ok(result.text.indexOf('PPTX-SLIDE-C')<result.text.indexOf('PPTX-SLIDE-A'));assert.ok(result.text.indexOf('PPTX-SLIDE-A')<result.text.indexOf('PPTX-SLIDE-B'));
});
test('a real picture-only PPTX cannot become ready from image filenames or invented OCR',async()=>{
 const parts=await readOfficeZipParts(imageOnlyPptx());assert.throws(()=>extractPptxParts(parts),code('document_text_unavailable'));
});
test('mixed graphics/notes retain genuine slide text with explicit partial coverage metadata',async()=>{
 const result=extractPptxParts(await readOfficeZipParts(mixedPptx()));assert.ok(result.text.includes('PPTX-MIXED-VISIBLE-TEXT 中文'));assert.equal(result.partial,true);assert.deepEqual(result.pagesWithoutText,[2]);assert.equal(result.ocr,false);
 for(const marker of ['CHART-CATEGORY-NOT-SLIDE-TEXT-A','CHART-SERIES-NOT-SLIDE-TEXT','PPTX-SPEAKER-NOTES-NOT-SLIDE-TEXT'])assert.equal(result.text.includes(marker),false);
 for(const kind of ['images','charts','speaker-notes'])assert.ok(result.unsupportedParts.includes(kind));
});
test('slide and character limits preserve real text and disclose the incomplete result',async()=>{
 const parts=await readOfficeZipParts(realPptx()),limited=extractPptxParts(parts,{limits:{maxPages:1}});assert.equal(limited.totalPages,3);assert.equal(limited.processedPages,1);assert.equal(limited.partial,true);assert.ok(limited.reasons.includes('page_limit'));assert.equal(limited.text.includes('PPTX-SLIDE-A'),false);
 const text=extractPptxParts(parts,{limits:{maxCharacters:80}});assert.equal(text.text.length,80);assert.equal(text.truncated,true);assert.ok(text.reasons.includes('character_limit'));
});
test('a missing or malformed required slide is an error, not partial success',async()=>{
 const parts=new Map(await readOfficeZipParts(realPptx()));parts.delete('ppt/slides/slide3.xml');assert.throws(()=>extractPptxParts(parts),code('file_corrupted'));
 parts.set('ppt/slides/slide3.xml',bytes('<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld>'));assert.throws(()=>extractPptxParts(parts),code('file_corrupted'));
});
test('an externally addressed required slide cannot fetch from a network',async()=>{
 const parts=new Map(await readOfficeZipParts(realPptx())),name='ppt/_rels/presentation.xml.rels';parts.set(name,bytes(decode(parts.get(name)).replace('Target="slides/slide3.xml"','Target="https://example.invalid/forbidden" TargetMode="External"')));assert.throws(()=>extractPptxParts(parts),code('file_corrupted'));
});
test('prefix aliases have no effect on real PresentationML text extraction',async()=>{
 const parts=new Map(await readOfficeZipParts(realPptx()));for(const[name,value]of parts)if(name==='ppt/presentation.xml'||/^ppt\/slides\/slide\d+\.xml$/.test(name))parts.set(name,bytes(decode(value).replaceAll('xmlns:p=','xmlns:alias=').replaceAll('<p:','<alias:').replaceAll('</p:','</alias:')));
 assert.equal(extractPptxParts(parts).text,extractPptxParts(await readOfficeZipParts(realPptx())).text);
});
test('a macro-enabled main part cannot masquerade as the supported PPTX format',async()=>{
 const parts=new Map(await readOfficeZipParts(realPptx()));parts.set('[Content_Types].xml',bytes(decode(parts.get('[Content_Types].xml')).replace('application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml','application/vnd.ms-powerpoint.presentation.macroEnabled.main+xml')));assert.throws(()=>extractPptxParts(parts),code('unhandled_mime_type'));
});
test('hidden slides are retained in file order with explicit metadata rather than silently dropped',async()=>{
 const parts=new Map(await readOfficeZipParts(realPptx())),name='ppt/slides/slide3.xml';parts.set(name,bytes(decode(parts.get(name)).replace('<p:sld ','<p:sld show="0" ')));const result=extractPptxParts(parts);assert.deepEqual(result.hiddenPages,[1]);assert.ok(result.text.startsWith('PPTX-SLIDE-C'));
});
test('an already cancelled extraction does not parse any package content',()=>{
 const controller=new AbortController();controller.abort();assert.throws(()=>extractPptxParts(new Map(),{signal:controller.signal}),error=>error.name==='AbortError');
});
