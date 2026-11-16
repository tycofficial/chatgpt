import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOfficeXml,directChildren,firstChild,officeAttribute,resolveOfficeTarget,readOfficeRelationships,findOfficeDocumentPart,readOfficeContentTypes,OFFICE_NAMESPACES as NS,OFFICE_XML_PARSER} from '../src/native-client/local-office-xml.mjs';
const bytes=text=>new TextEncoder().encode(text),code=expected=>error=>error.code===expected;
test('the pinned real XML parser uses namespace URIs and decodes ordinary entities',()=>{
 const doc=parseOfficeXml(bytes('<other:root xmlns:other="urn:fixture" xmlns:rel="urn:rel"><other:text rel:id="r1">A &amp; B &lt; C &#x03A9;</other:text></other:root>'));
 const child=firstChild(doc.documentElement,'urn:fixture','text');assert.equal(child.textContent,'A & B < C Ω');assert.equal(officeAttribute(child,'urn:rel','id'),'r1');assert.equal(directChildren(doc.documentElement,'urn:not-fixture').length,0);assert.equal(OFFICE_XML_PARSER.version,'0.8.15');
});
test('real UTF16 bytes and non-ASCII text are decoded without changing the XML declaration',()=>{
 const text='<?xml version="1.0" encoding="UTF-16"?><r>中文 Ω</r>',data=Uint8Array.from(Buffer.concat([Buffer.from([255,254]),Buffer.from(text,'utf16le')]));assert.equal(parseOfficeXml(data).documentElement.textContent,'中文 Ω');
});
test('malformed XML and undeclared entities are rejected instead of returned as plausible text',()=>{
 for(const text of ['<r><child></r>','<r>&missing;</r>','<r/><other/>'])assert.throws(()=>parseOfficeXml(bytes(text)),code('file_corrupted'));
});
test('DTD/external/custom entity declarations are rejected before they can reference a resource',()=>{
 for(const text of ['<!DOCTYPE r SYSTEM "https://example.invalid/no-fetch"><r/>','<!DOCTYPE r [<!ENTITY x "expanded">]><r>&x;</r>'])assert.throws(()=>parseOfficeXml(bytes(text)),code('unhandled_mime_type'));
});
test('comments and CDATA mentioning a doctype remain ordinary literal content',()=>{
 const doc=parseOfficeXml(bytes('<r><!-- <!DOCTYPE ignored> --><![CDATA[<!DOCTYPE literal>]]></r>'));assert.equal(doc.documentElement.textContent,'<!DOCTYPE literal>');
});
test('XML part byte, actual node and actual nesting limits reject oversized documents',()=>{
 assert.throws(()=>parseOfficeXml(bytes('<r>abcdef</r>'),{limits:{maxXmlPartBytes:5}}),code('document_container_limit'));
 assert.throws(()=>parseOfficeXml(bytes('<r><a/><b/></r>'),{limits:{maxXmlNodes:3}}),code('document_container_limit'));
 assert.throws(()=>parseOfficeXml(bytes('<r><a><b/></a></r>'),{limits:{maxXmlDepth:2}}),code('document_container_limit'));
});
test('internal OPC relationships resolve relative paths while external, ambiguous and escaping targets fail',()=>{
 assert.equal(resolveOfficeTarget('ppt/slides/slide1.xml','../media/a%20b.png'),'ppt/media/a b.png');assert.equal(resolveOfficeTarget('','/ppt/presentation.xml'),'ppt/presentation.xml');
 for(const target of ['https://example.invalid/x','//example.invalid/x','../../outside.xml','..\\outside.xml','x%2fy.xml','a.xml?x=1','a.xml#fragment'])assert.throws(()=>resolveOfficeTarget('ppt/presentation.xml',target),code('file_corrupted'));
 assert.throws(()=>resolveOfficeTarget('','x.xml',{targetMode:'External'}),code('file_corrupted'));
});
test('the root officeDocument relationship is required, unique and internal',()=>{
 const root='<Relationships xmlns="'+NS.packageRelationship+'"><Relationship Id="main" Type="'+NS.officeRelationship[0]+'/officeDocument" Target="ppt/presentation.xml"/></Relationships>',parts=new Map([['_rels/.rels',bytes(root)],['ppt/presentation.xml',bytes('<r/>')]]);
 assert.equal(findOfficeDocumentPart(parts),'ppt/presentation.xml');assert.equal(readOfficeRelationships(parts,'missing.xml').size,0);
 assert.throws(()=>readOfficeRelationships(parts,'missing.xml',{required:true}),code('file_corrupted'));
 const duplicate=new Map(parts);duplicate.set('_rels/.rels',bytes(root.replace('</Relationships>','<Relationship Id="main" Type="other" Target="x"/></Relationships>')));assert.throws(()=>findOfficeDocumentPart(duplicate),code('file_corrupted'));
});
test('external hyperlinks are represented as metadata and never followed by relationship reading',()=>{
 const source='<Relationships xmlns="'+NS.packageRelationship+'"><Relationship Id="link" Type="'+NS.officeRelationship[0]+'/hyperlink" Target="https://example.invalid/no-fetch" TargetMode="External"/></Relationships>',parts=new Map([['ppt/_rels/presentation.xml.rels',bytes(source)]]);
 const link=readOfficeRelationships(parts,'ppt/presentation.xml').get('link');assert.equal(link.external,true);assert.equal(link.target,'https://example.invalid/no-fetch');
});
test('OPC content type overrides and defaults are namespace-aware and duplicate-safe',()=>{
 const xml='<Types xmlns="'+NS.contentTypes+'"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="presentation-fixture"/></Types>',types=readOfficeContentTypes(new Map([['[Content_Types].xml',bytes(xml)]]));assert.equal(types.overrides.get('ppt/presentation.xml'),'presentation-fixture');assert.equal(types.defaults.get('xml'),'application/xml');
});
