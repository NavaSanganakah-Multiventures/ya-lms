import { mock } from 'bun:test'; mock.module('cloudflare:email', () => ({ EmailMessage: class {} }));
