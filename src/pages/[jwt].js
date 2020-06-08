
import React, { useState } from 'react';
import getConfig from 'next/config';
import Airtable from 'airtable';
import { verify } from 'jsonwebtoken';
import { Heading } from '@codeday/topo/Atom/Text';
import { default as TextInput } from '@codeday/topo/Atom/Input/Text';
import { default as TextArea } from '@codeday/topo/Atom/Input/Textarea';
import Box from '@codeday/topo/Atom/Box';
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

  const {
    base: baseId,
    table: tableId,
    record: recordId,
    title, titleString,
    confirmField,
    confirmState,
    fields
  } = verify(jwt, serverRuntimeConfig.appSecret);

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
      titleString: titleString || null,
      confirmField: confirmField || null,
      confirmState: confirmState || null,
      currentState: confirmField ? record.fields[confirmField] === (confirmState || true) : false,
      title: title ? (record.fields[title] || null) : null,
      fields: fields ? mapFields(fields, record.fields) : [],
      jwt,
    }
  }
};

export default function Home({ error, title, titleString, fields, confirmField, currentState, jwt }) {
  const [edits, setEdits] = useState(fields.reduce((accum, field) => ({ ...accum, [field.name]: field.value }), {}));
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(currentState);

  if (error) return (
    <Page slug="/" title="Not Found">
      <Content>
        <Heading as="h2" fontSize="4xl" textAlign="center">That page wasn't found.</Heading>
      </Content>
    </Page>
  );

  if (confirmField) return (
		<Page slug="/" title={titleString || `Confirm ${title || 'Entry'}`}>
			<Content>
        <Heading as="h2" fontSize="4xl" textAlign="center">{titleString || `Confirm ${title || 'Entry'}?`}</Heading>
        {confirmed ? (
          <Box textAlign="center">
            <p>You are confirmed! Thank you!</p>
          </Box>
        ) : (
          <Box textAlign="center">
            <Button
              variantColor="green"
              disabled={saving}
              isLoading={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  const result = await fetch('/api/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ jwt }),
                  });
                  setConfirmed(true);
                } catch (err) {
                  console.error(err);
                }
                setSaving(false);
              }}
            >
              Confirm
            </Button>
          </Box>
        )}
			</Content>
		</Page>
  )

	return (
		<Page slug="/" title={titleString || `Editing ${title || 'Entry'}`}>
			<Content>
      <Heading as="h2" fontSize="4xl" textAlign="center">{titleString || `Editing ${title || 'Entry'}`}</Heading>
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
