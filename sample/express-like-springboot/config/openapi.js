import { OpenAPIBackend } from 'openapi-backend';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createOpenAPIBackend(handlers) {
  const definitionYaml = readFileSync(join(__dirname, '..', 'openapi.yaml'), 'utf8');
  const definition = yaml.load(definitionYaml);

  return new OpenAPIBackend({
    definition,
    strict: false,
    validate: false,
    ajvOptions: {
      allErrors: false,
      verbose: false,
      strict: false,
      strictSchema: false,
      strictNumbers: false,
      strictTypes: false,
      strictRequired: false,
      strictFormats: false,
      formats: {
        'date-time': true
      }
    },
    handlers: {
      ...handlers,
      notFound: (c, req, res) => {
        return res.status(404).json({ error: 'Not found' });
      },
      validationFail: (c, req, res) => {
        return res.status(400).json({ error: c.validation.errors });
      }
    }
  });
}