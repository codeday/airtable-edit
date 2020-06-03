
import React, { useState } from 'react';
import getConfig from 'next/config';
import Airtable from 'airtable';
import { verify } from 'jsonwebtoken';
import { Heading } from '@codeday/topo/Atom/Text';
import { default as TextInput } from '@codeday/topo/Atom/Input/Text';
import { default as TextArea } from '@codeday/topo/Atom/Input/Textarea';
import FormControl, { Label as FormLabel } from '@codeday/topo/Molecule/FormControl';
import Button from '@codeday/topo/Atom/Button';
import Content from '@codeday/topo/Molecule/Content';
import Page from '../components/page';

const { serverRuntimeConfig } = getConfig();

const mapFields = (schema, fields) => {
  return schema.map((fieldSchema) => {
    return {
      ...fieldSchema,
      value: fields[fieldSchema.name],
    };
  });
}

export const getServerSideProps = async ({ params: { jwt }, query, res }) => {
  // Verify the JWT
  try {
    verify(jwt, serverRuntimeConfig.appSecret);
  } catch (err) {
    console.error(`invalid jwt: ${jwt}`)
    res.statusCode = 404;
    return { props: { error: true }};
  }

  const { base: baseId, table: tableId, record: recordId, title, fields } = verify(jwt, serverRuntimeConfig.appSecret);

  // Load the Airtable record
  const base = new Airtable({ apiKey: serverRuntimeConfig.airtableKey }).base(baseId);
  let record;
  try {
    record = await base(tableId).find(recordId);
  } catch (err) {
    res.statusCode = 404;
    return { props: {error: true }};
  }

  return {
    props: {
      title: record.fields[title],
      fields: mapFields(fields, record.fields),
      jwt,
    }
  }
};

export default function Home({ error, title, fields, jwt }) {
  const [edits, setEdits] = useState(fields.reduce((accum, field) => ({ ...accum, [field.name]: field.value }), {}));
  const [saving, setSaving] = useState(false);

  if (error) return (
    <Page slug="/" title="Not Found">
      <Content>
        <Heading as="h2" fontSize="5xl" textAlign="center">That page wasn't found.</Heading>
      </Content>
    </Page>
  );

	return (
		<Page slug="/" title={`Editing ${title}`}>
			<Content>
      <Heading as="h2" fontSize="5xl" textAlign="center">Editing {title}</Heading>
      {fields.map((field) => {
        const EditorElem = {
          textarea: TextArea,
          text: TextInput,
        }[field.type || 'text'];
        return (
          <FormControl>
            <FormLabel>{field.name}</FormLabel>
            <EditorElem
              value={edits[field.name]}
              disabled={field.readonly || false}
              onChange={(e) => { !field.readonly && setEdits({ ...edits, [field.name]: e.target.value }); }}
            />
          </FormControl>
        )
      })}
      <Button
        variantColor="green"
        disabled={saving || !fields.reduce((accum, field) => accum && (!field.required || edits[field.name]), true)}
        isLoading={saving}
        onClick={async () => {
          setSaving(true);
          try {
            const result = await fetch('/api/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ jwt, edits }),
            });
          } catch (err) {
            console.error(err);
          }
          setSaving(false);
        }}
      >
        Save
      </Button>
			</Content>
		</Page>
	)
}
