import getConfig from 'next/config';
import Airtable from 'airtable';
import { verify } from 'jsonwebtoken';

const { serverRuntimeConfig } = getConfig();

export default async (req, res) => {
  const { body: { jwt } } = req;
  const {
    base: baseId,
    table: tableId,
    record: recordId,
    confirmField,
    confirmState,
  } = verify(jwt, serverRuntimeConfig.appSecret);
  const base = new Airtable({ apiKey: serverRuntimeConfig.airtableKey }).base(baseId);

  await base(tableId).update([{ id: recordId, fields: { [confirmField]: confirmState || true } }]);
  res.send('ok');
};
