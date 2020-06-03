import getConfig from 'next/config';
import Airtable from 'airtable';
import { verify } from 'jsonwebtoken';

const { serverRuntimeConfig } = getConfig();

export default async (req, res) => {
  const { body: { jwt, edits } } = req;
  const { base: baseId, table: tableId, record: recordId, fields } = verify(jwt, serverRuntimeConfig.appSecret);
  const base = new Airtable({ apiKey: serverRuntimeConfig.airtableKey }).base(baseId);

  const hasRequired = fields.filter((f) => f.required).reduce((accum, f) => accum && edits[f.name], true);
  if (!hasRequired) throw new Error('Missing required field');

  const filteredEdits = fields
    .filter((f) => !f.readonly)
    .reduce((accum, f) => ({ ...accum, [f.name]: edits[f.name] }), {});

  await base(tableId).update([{ id: recordId, fields: filteredEdits }]);

  res.send('ok');
};
