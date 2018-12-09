import test from 'ava';

const asn1Mapper = require('..');

const CLS_UNIVERSAL = 0;
const CLS_CONTEXT_SPECIFIC = 2;

const FORM_PRIMITIVE = 0;
const FORM_CONSTRUCTED = 1;

const TAG_INTEGER = 2;
const TAG_OCTET_STRING = 4;
const TAG_NULL = 5;
const TAG_ENUMERATED = 10;
const TAG_SEQUENCE = 16;

test('fromTree: class mismatch', (t) => {
  const tree = {
    cls: CLS_CONTEXT_SPECIFIC,
    form: FORM_PRIMITIVE,
    tagCode: TAG_OCTET_STRING,
    value: Buffer.from([ 1, 2, 3 ])
  };
  const definition = {
    type: 'OCTET STRING'
  };

  t.is(asn1Mapper.fromTree(tree, definition), null);
});

test('fromTree: form mismatch', (t) => {
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_CONSTRUCTED,
    tagCode: TAG_SEQUENCE,
    elements: [{
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: Buffer.from([ 1, 2, 3 ])
    }]
  };
  const definition = {
    type: 'OCTET STRING'
  };

  t.is(asn1Mapper.fromTree(tree, definition), null);
});

test('fromTree: tag mismatch', (t) => {
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_PRIMITIVE,
    tagCode: TAG_OCTET_STRING,
    value: Buffer.from([ 1, 2, 3 ])
  };
  const definition = {
    type: 'INTEGER'
  };

  t.is(asn1Mapper.fromTree(tree, definition), null);
});

test('fromTree: universal primitive', (t) => {
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_PRIMITIVE,
    tagCode: TAG_OCTET_STRING,
    value: Buffer.from([ 1, 2, 3 ])
  };
  const definition = {
    type: 'OCTET STRING'
  };
  const mapped = Buffer.from([ 1, 2, 3 ]);

  t.deepEqual(asn1Mapper.fromTree(tree, definition), mapped);
});

test('fromTree: context-specific primitive', (t) => {
  const tree = {
    cls: CLS_CONTEXT_SPECIFIC,
    form: FORM_PRIMITIVE,
    tagCode: 0,
    value: Buffer.from([ 1, 2, 3 ])
  };
  const definition = {
    type: 'OCTET STRING',
    tag: 0
  };
  const mapped = Buffer.from([ 1, 2, 3 ]);

  t.deepEqual(asn1Mapper.fromTree(tree, definition), mapped);
});

test('fromFree: decoding INTEGER', (t) => {
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_PRIMITIVE,
    tagCode: TAG_INTEGER,
    value: Buffer.from([ 0x12, 0x34 ])
  };
  const definition = {
    type: 'INTEGER'
  };
  const mapped = 0x1234;

  t.is(asn1Mapper.fromTree(tree, definition), mapped);
});

test('fromFree: decoding NULL', (t) => {
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_PRIMITIVE,
    tagCode: TAG_NULL,
    value: Buffer.from([])
  };
  const definition = {
    type: 'NULL'
  };
  const mapped = true;

  t.is(asn1Mapper.fromTree(tree, definition), mapped);
});

test('fromFree: decoding ENUMERATED', (t) => {
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_PRIMITIVE,
    tagCode: TAG_ENUMERATED,
    value: Buffer.from([ 2 ])
  };
  const definition = {
    type: 'ENUMERATED',
    values: [
      { name: 'one', value: 1 },
      { name: 'two', value: 2 }
    ]
  };
  const mapped = 'two';

  t.is(asn1Mapper.fromTree(tree, definition), mapped);
});

test('fromFree: decoding ENUMERATED with unmatched value', (t) => {
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_PRIMITIVE,
    tagCode: TAG_ENUMERATED,
    value: Buffer.from([ 3 ])
  };
  const definition = {
    type: 'ENUMERATED',
    values: [
      { name: 'one', value: 1 },
      { name: 'two', value: 2 }
    ]
  };
  const mapped = 3;

  t.is(asn1Mapper.fromTree(tree, definition), mapped);
});

test('fromTree: SEQUENCE with single primitive', (t) => {
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_CONSTRUCTED,
    tagCode: TAG_SEQUENCE,
    elements: [{
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: Buffer.from([ 1, 2, 3 ])
    }]
  };
  const definition = {
    type: 'SEQUENCE',
    elements: [{
      name: 'foo',
      type: 'OCTET STRING'
    }]
  };
  const mapped = {
    foo: Buffer.from([ 1, 2, 3 ])
  };

  t.deepEqual(asn1Mapper.fromTree(tree, definition), mapped);
});

test('fromTree: SEQUENCE with tagged primitives', (t) => {
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_CONSTRUCTED,
    tagCode: TAG_SEQUENCE,
    elements: [{
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: Buffer.from([ 1, 2, 3 ])
    }, {
      cls: CLS_CONTEXT_SPECIFIC,
      form: FORM_PRIMITIVE,
      tagCode: 0,
      value: Buffer.from([ 2, 3, 4 ])
    }, {
      cls: CLS_CONTEXT_SPECIFIC,
      form: FORM_PRIMITIVE,
      tagCode: 2,
      value: Buffer.from([ 4, 5, 6 ])
    }]
  };
  const definition = {
    type: 'SEQUENCE',
    elements: [{
      name: 'foo',
      type: 'OCTET STRING'
    }, {
      name: 'bar',
      type: 'OCTET STRING',
      tag: 0,
      implicit: true,
      optional: true
    }, {
      name: 'baz',
      type: 'OCTET STRING',
      tag: 1,
      implicit: true,
      optional: true
    }, {
      name: 'qux',
      type: 'OCTET STRING',
      tag: 2,
      implicit: true,
      optional: true
    }]
  };
  const mapped = {
    foo: Buffer.from([ 1, 2, 3 ]),
    bar: Buffer.from([ 2, 3, 4 ]),
    qux: Buffer.from([ 4, 5, 6 ])
  };

  t.deepEqual(asn1Mapper.fromTree(tree, definition), mapped);
});

test('fromTree: SEQUENCE with unmatched optional element', (t) => {
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_CONSTRUCTED,
    tagCode: TAG_SEQUENCE,
    elements: [{
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: Buffer.from([ 1, 2, 3 ])
    }, {
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_INTEGER,
      value: Buffer.from([ 1 ])
    }]
  };
  const definition = {
    type: 'SEQUENCE',
    elements: [{
      name: 'foo',
      type: 'OCTET STRING'
    }, {
      name: 'bar',
      type: 'OCTET STRING',
      optional: true
    }, {
      name: 'baz',
      type: 'INTEGER'
    }]
  };
  const mapped = {
    foo: Buffer.from([ 1, 2, 3 ]),
    baz: 1
  };

  t.deepEqual(asn1Mapper.fromTree(tree, definition), mapped);
});

test('fromTree: SEQUENCE with unmatched mandatory element', (t) => {
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_CONSTRUCTED,
    tagCode: TAG_SEQUENCE,
    elements: [{
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: Buffer.from([ 1, 2, 3 ])
    }, {
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_INTEGER,
      value: Buffer.from([ 1 ])
    }]
  };
  const definition = {
    type: 'SEQUENCE',
    elements: [{
      name: 'foo',
      type: 'OCTET STRING'
    }, {
      name: 'bar',
      type: 'OCTET STRING'
    }]
  };

  t.throws(() => {
    asn1Mapper.fromTree(tree, definition);
  });
});

test('fromTree: SEQUENCE OF', (t) => {
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_CONSTRUCTED,
    tagCode: TAG_SEQUENCE,
    elements: [{
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: Buffer.from([ 1, 2, 3 ])
    }, {
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: Buffer.from([ 4, 5, 6 ])
    }]
  };
  const definition = {
    type: 'SEQUENCE',
    ofElement: {
      type: 'OCTET STRING'
    }
  };
  const mapped = [
    Buffer.from([ 1, 2, 3 ]),
    Buffer.from([ 4, 5, 6 ])
  ];

  t.deepEqual(asn1Mapper.fromTree(tree, definition), mapped);
});

test('fromTree: SEQUENCE OF with unmatched element', (t) => {
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_CONSTRUCTED,
    tagCode: TAG_SEQUENCE,
    elements: [{
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: Buffer.from([ 1, 2, 3 ])
    }, {
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_INTEGER,
      value: Buffer.from([ 1 ])
    }]
  };
  const definition = {
    type: 'SEQUENCE',
    ofElement: {
      type: 'OCTET STRING'
    }
  };

  t.throws(() => {
    asn1Mapper.fromTree(tree, definition);
  });
});

test('fromTree: CHOICE where second choice matches', (t) => {
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_PRIMITIVE,
    tagCode: TAG_OCTET_STRING,
    value: Buffer.from([ 1, 2, 3 ])
  };
  const definition = {
    type: 'CHOICE',
    elements: [{
      name: 'foo',
      type: 'INTEGER'
    }, {
      name: 'bar',
      type: 'OCTET STRING'
    }]
  };
  const mapped = {
    bar: Buffer.from([ 1, 2, 3 ])
  };

  t.deepEqual(asn1Mapper.fromTree(tree, definition), mapped);
});

test('fromTree: CHOICE where element is CLS_CONTEXT_SPECIFIC and first choice matches', (t) => {
  const tree = {
    cls: CLS_CONTEXT_SPECIFIC,
    form: FORM_CONSTRUCTED,
    tagCode: 3,
    elements: [{
      cls: CLS_CONTEXT_SPECIFIC,
      form: FORM_PRIMITIVE,
      tagCode: 0,
      value: Buffer.from([])
    }]
  };
  const definition = {
    type: 'CHOICE',
    tag: 3,
    elements: [{
      name: 'foo',
      tag: 0,
      type: 'NULL'
    }, {
      name: 'bar',
      tag: 1,
      type: 'OCTET STRING'
    }]
  };
  const mapped = {
    foo: true
  };

  t.deepEqual(asn1Mapper.fromTree(tree, definition), mapped);
});

test('fromTree: CHOICE where element is CLS_CONTEXT_SPECIFIC and second choice matches', (t) => {
  const tree = {
    cls: CLS_CONTEXT_SPECIFIC,
    form: FORM_CONSTRUCTED,
    tagCode: 3,
    elements: [{
      cls: CLS_CONTEXT_SPECIFIC,
      form: FORM_PRIMITIVE,
      tagCode: 1,
      value: Buffer.from([1, 2, 3])
    }]
  };
  const definition = {
    type: 'CHOICE',
    tag: 3,
    elements: [{
      name: 'foo',
      tag: 0,
      type: 'NULL'
    }, {
      name: 'bar',
      tag: 1,
      type: 'OCTET STRING'
    }]
  };
  const mapped = {
    bar: Buffer.from([1, 2, 3])
  };

  t.deepEqual(asn1Mapper.fromTree(tree, definition), mapped);
});

test('fromTree: CHOICE where element is CLS_CONTEXT_SPECIFIC and no choice matches', (t) => {
  const tree = {
    cls: CLS_CONTEXT_SPECIFIC,
    form: FORM_CONSTRUCTED,
    tagCode: 3,
    elements: [{
      cls: CLS_CONTEXT_SPECIFIC,
      form: FORM_PRIMITIVE,
      tagCode: 2,
      value: Buffer.from([1, 2, 3])
    }]
  };
  const definition = {
    type: 'CHOICE',
    tag: 3,
    elements: [{
      name: 'foo',
      tag: 0,
      type: 'NULL'
    }, {
      name: 'bar',
      tag: 1,
      type: 'OCTET STRING'
    }]
  };

  const error = t.throws(() => asn1Mapper.fromTree(tree, definition));
  t.is(error.message, 'No definitions found for element.');
});

test('fromTree: CHOICE where no choices match', (t) => {
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_PRIMITIVE,
    tagCode: TAG_NULL,
    value: Buffer.from([])
  };
  const definition = {
    type: 'CHOICE',
    elements: [{
      name: 'foo',
      type: 'INTEGER'
    }, {
      name: 'bar',
      type: 'OCTET STRING'
    }]
  };

  t.is(asn1Mapper.fromTree(tree, definition), null);
});

test('toTree: universal primitive', (t) => {
  const mapped = Buffer.from([ 1, 2, 3 ]);
  const definition = {
    type: 'OCTET STRING'
  };
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_PRIMITIVE,
    tagCode: TAG_OCTET_STRING,
    value: Buffer.from([ 1, 2, 3 ])
  };

  t.deepEqual(asn1Mapper.toTree(mapped, definition), tree);
});

test('toTree: encoding INTEGER', (t) => {
  const mapped = 0x1234;
  const definition = {
    type: 'INTEGER'
  };
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_PRIMITIVE,
    tagCode: TAG_INTEGER,
    value: Buffer.from([ 0x12, 0x34 ])
  };

  t.deepEqual(asn1Mapper.toTree(mapped, definition), tree);
});

test('toTree: encoding NULL', (t) => {
  const mapped = true;
  const definition = {
    type: 'NULL'
  };
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_PRIMITIVE,
    tagCode: TAG_NULL,
    value: Buffer.from([])
  };

  t.deepEqual(asn1Mapper.toTree(mapped, definition), tree);
});

test('toTree: encoding NULL with non-truthy value', (t) => {
  const mapped = false;
  const definition = {
    type: 'NULL'
  };
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_PRIMITIVE,
    tagCode: TAG_NULL,
    value: null
  };

  t.deepEqual(asn1Mapper.toTree(mapped, definition), tree);
});

test('toTree: encoding ENUMERATED', (t) => {
  const mapped = 'two';
  const definition = {
    type: 'ENUMERATED',
    values: [
      { name: 'one', value: 1 },
      { name: 'two', value: 2 }
    ]
  };
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_PRIMITIVE,
    tagCode: TAG_ENUMERATED,
    value: Buffer.from([ 2 ])
  };

  t.deepEqual(asn1Mapper.toTree(mapped, definition), tree);
});

test('toTree: context-specific primitive', (t) => {
  const mapped = Buffer.from([ 1, 2, 3 ]);
  const definition = {
    type: 'OCTET STRING',
    tag: 0
  };
  const tree = {
    cls: CLS_CONTEXT_SPECIFIC,
    form: FORM_PRIMITIVE,
    tagCode: 0,
    value: Buffer.from([ 1, 2, 3 ])
  };

  t.deepEqual(asn1Mapper.toTree(mapped, definition), tree);
});

test('toTree: SEQUENCE with single primitive', (t) => {
  const mapped = {
    foo: Buffer.from([ 1, 2, 3 ])
  };
  const definition = {
    type: 'SEQUENCE',
    elements: [{
      name: 'foo',
      type: 'OCTET STRING'
    }]
  };
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_CONSTRUCTED,
    tagCode: TAG_SEQUENCE,
    elements: [{
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: Buffer.from([ 1, 2, 3 ])
    }]
  };

  t.deepEqual(asn1Mapper.toTree(mapped, definition), tree);
});

test('toTree: context-specific SEQUENCE with a single primitive', (t) => {
  const mapped = {
    foo: Buffer.from([ 1, 2, 3 ])
  };
  const definition = {
    type: 'SEQUENCE',
    tag: 100,
    elements: [{
      name: 'foo',
      type: 'OCTET STRING'
    }]
  };
  const tree = {
    cls: CLS_CONTEXT_SPECIFIC,
    form: FORM_CONSTRUCTED,
    tagCode: 100,
    elements: [{
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: Buffer.from([ 1, 2, 3 ])
    }]
  };

  t.deepEqual(asn1Mapper.toTree(mapped, definition), tree);
});

test('toTree: SEQUENCE with tagged primitives', (t) => {
  const mapped = {
    foo: Buffer.from([ 1, 2, 3 ]),
    bar: Buffer.from([ 2, 3, 4 ]),
    qux: Buffer.from([ 4, 5, 6 ])
  };
  const definition = {
    type: 'SEQUENCE',
    elements: [{
      name: 'foo',
      type: 'OCTET STRING',
    }, {
      name: 'bar',
      type: 'OCTET STRING',
      tag: 0,
      implicit: true,
      optional: true
    }, {
      name: 'baz',
      type: 'OCTET STRING',
      tag: 1,
      implicit: true,
      optional: true
    }, {
      name: 'qux',
      type: 'OCTET STRING',
      tag: 2,
      implicit: true,
      optional: true
    }]
  };
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_CONSTRUCTED,
    tagCode: TAG_SEQUENCE,
    elements: [{
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: Buffer.from([ 1, 2, 3 ])
    }, {
      cls: CLS_CONTEXT_SPECIFIC,
      form: FORM_PRIMITIVE,
      tagCode: 0,
      value: Buffer.from([ 2, 3, 4 ])
    }, {
      cls: CLS_CONTEXT_SPECIFIC,
      form: FORM_PRIMITIVE,
      tagCode: 2,
      value: Buffer.from([ 4, 5, 6 ])
    }]
  };

  t.deepEqual(asn1Mapper.toTree(mapped, definition), tree);
});

test('toTree: SEQUENCE where value is not an object', (t) => {
  const mapped = Buffer.from([ 1, 2, 3 ]);
  const definition = {
    type: 'SEQUENCE',
    elements: [{
      name: 'foo',
      type: 'OCTET STRING',
    }]
  };

  t.throws(() => {
    asn1Mapper.toTree(mapped, definition);
  });
});

test('toTree: SEQUENCE OF', (t) => {
  const mapped = [
    Buffer.from([ 1, 2, 3 ]),
    Buffer.from([ 4, 5, 6 ])
  ];
  const definition = {
    type: 'SEQUENCE',
    ofElement: {
      type: 'OCTET STRING'
    }
  };
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_CONSTRUCTED,
    tagCode: TAG_SEQUENCE,
    elements: [{
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: Buffer.from([ 1, 2, 3 ])
    }, {
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: Buffer.from([ 4, 5, 6 ])
    }]
  };

  t.deepEqual(asn1Mapper.toTree(mapped, definition), tree);
});

test('toTree: context-specific SEQUENCE OF', (t) => {
  const mapped = [
    Buffer.from([ 1, 2, 3 ]),
    Buffer.from([ 4, 5, 6 ])
  ];
  const definition = {
    type: 'SEQUENCE',
    tag: 100,
    ofElement: {
      type: 'OCTET STRING'
    }
  };
  const tree = {
    cls: CLS_CONTEXT_SPECIFIC,
    form: FORM_CONSTRUCTED,
    tagCode: 100,
    elements: [{
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: Buffer.from([ 1, 2, 3 ])
    }, {
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: Buffer.from([ 4, 5, 6 ])
    }]
  };

  t.deepEqual(asn1Mapper.toTree(mapped, definition), tree);
});

test('toTree: SEQUENCE OF where value is not an array', (t) => {
  const mapped = Buffer.from([ 1, 2, 3 ]);
  const definition = {
    type: 'SEQUENCE',
    ofElement: {
      type: 'OCTET STRING'
    }
  };

  t.throws(() => {
    asn1Mapper.toTree(mapped, definition);
  });
});

test('toTree: CHOICE where second choice matches', (t) => {
  const mapped = {
    bar: Buffer.from([ 1, 2, 3 ])
  };

  const definition = {
    type: 'CHOICE',
    elements: [{
      name: 'foo',
      type: 'INTEGER'
    }, {
      name: 'bar',
      type: 'OCTET STRING'
    }]
  };
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_PRIMITIVE,
    tagCode: TAG_OCTET_STRING,
    value: Buffer.from([ 1, 2, 3 ])
  };

  t.deepEqual(asn1Mapper.toTree(mapped, definition), tree);
});

test('toTree: CHOICE where no choices match', (t) => {
  const mapped = {
    baz: Buffer.from([ 1, 2, 3 ])
  };

  const definition = {
    type: 'CHOICE',
    elements: [{
      name: 'foo',
      type: 'INTEGER'
    }, {
      name: 'bar',
      type: 'NULL'
    }]
  };

  t.throws(() => {
    asn1Mapper.toTree(mapped, definition);
  });
});

test('toTree: CHOICE element with tag where first choice matches', (t) => {
  const mapped = {
      foo: 71
  };

  const definition = {
    name: 'test',
    type: 'CHOICE',
    tag: 18,
    elements: [{
      name: 'foo',
      type: 'INTEGER'
    }, {
      name: 'bar',
      type: 'OCTET STRING'
    }]
  };

  const tree = {
    cls: CLS_CONTEXT_SPECIFIC,
    form: FORM_CONSTRUCTED,
    tagCode: 18,
    elements: [{
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_INTEGER,
      value: Buffer.from([71])
    }]
  };

  t.deepEqual(asn1Mapper.toTree(mapped, definition), tree);
});

test('toTree: CHOICE element with tag where second choice matches', (t) => {
  const mapped = {
      bar: Buffer.from([ 1, 2, 3 ])
  };

  const definition = {
    name: 'test',
    type: 'CHOICE',
    tag: 18,
    elements: [{
      name: 'foo',
      type: 'INTEGER'
    }, {
      name: 'bar',
      type: 'OCTET STRING'
    }]
  };

  const tree = {
    cls: CLS_CONTEXT_SPECIFIC,
    form: FORM_CONSTRUCTED,
    tagCode: 18,
    elements: [{
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: Buffer.from([ 1, 2, 3 ])
    }]
  };

  t.deepEqual(asn1Mapper.toTree(mapped, definition), tree);
});
