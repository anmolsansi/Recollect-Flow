import { describe, expect, it } from 'vitest';

import { serializeCsv } from '../src/recovery/csv';

describe('OPE-228 portable CSV serializer', () => {
  it('escapes commas quotes and newlines without losing structured values', () => {
    const csv = serializeCsv(
      ['title', 'note', 'attachments'],
      [
        {
          title: 'One, two',
          note: 'She said "save it"\nthen left',
          attachments: [{ id: 'a1', object_key: 'attachments/a1' }],
        },
      ],
    );

    expect(csv).toBe(
      'title,note,attachments\r\n' +
        '"One, two","She said ""save it""\nthen left","[{""id"":""a1"",""object_key"":""attachments/a1""}]"\r\n',
    );
  });
});
