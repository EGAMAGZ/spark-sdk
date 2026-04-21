import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { build, Rolldown } from 'vite';
import spark from '../src/plugin.ts';
import { resolve } from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

describe('spark plugin integration', () => {
  let tempDir: string;
  beforeEach(async () => {
    tempDir = await mkdtemp(resolve(tmpdir(), 'spark-test-'));
  });

  it('generate .aspx', async () => {
    await writeFile(
      resolve(tempDir, 'index.html'),
      `<html><head><link rel="stylesheet" href="/styles/main.css"></head><body><p>Hello World</p></body></html>`,
    );

    const result = await build({
      plugins: [spark()],
      root: tempDir,
      build: {
        outDir: resolve(tempDir, 'dist'),
      },
      configFile: false,
    });

    console.log(result);
    console.log(result.output);
    console.dir(JSON.stringify(result));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });
});

/*describe('spark plugin integration', () => {
  it('generates .aspx file from .html input', async () => {
    const tempDir = await mkdtemp(resolve(tmpdir(), 'spark-test-'));
    try {
      await writeFile(
        resolve(tempDir, 'index.html'),
        `<html><head><link rel="stylesheet" href="/styles/main.css"></head><body><p>Hello World</p></body></html>`,
      );
      const result = await build({
        plugins: [spark()],
        root: tempDir,
        build: {
          outDir: resolve(tempDir, 'dist'),
        },
        configFile: false,
      });
      const output = result.output;
      const aspxFile = output.find((f) => f.fileName === 'index.aspx');
      expect(aspxFile).toBeDefined();
      expect(aspxFile.type).toBe('asset');
      expect(aspxFile.source).toContain('<%@ Page language="C#"');
      expect(aspxFile.source).toContain(
        'ContentPlaceHolderId="PlaceHolderMain"',
      );
      expect(aspxFile.source).toContain('Hello World');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
  it('removes original .html file from output', async () => {
    const tempDir = await mkdtemp(resolve(tmpdir(), 'spark-test-'));
    try {
      await writeFile(
        resolve(tempDir, 'index.html'),
        `<html><body><p>Content</p></body></html>`,
      );
      const result = await build({
        plugins: [spark()],
        root: tempDir,
        build: {
          outDir: resolve(tempDir, 'dist'),
        },
        configFile: false,
      });
      const output = result.output;
      const htmlFile = output.find((f) => f.fileName === 'index.html');
      expect(htmlFile).toBeUndefined();
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
  it('converts multiple HTML files to aspx', async () => {
    const tempDir = await mkdtemp(resolve(tmpdir(), 'spark-test-'));
    try {
      await writeFile(
        resolve(tempDir, 'about.html'),
        `<html><body><p>About Page</p></body></html>`,
      );
      await writeFile(
        resolve(tempDir, 'contact.html'),
        `<html><body><p>Contact Page</p></body></html>`,
      );
      const result = await build({
        plugins: [spark()],
        root: tempDir,
        build: {
          outDir: resolve(tempDir, 'dist'),
        },
        configFile: false,
      });
      const output = result.output;
      const files = output.filter((f) => f.type === 'asset').map((f) =>
        f.fileName
      );
      expect(files).toContain('about.aspx');
      expect(files).toContain('contact.aspx');
      expect(files).not.toContain('about.html');
      expect(files).not.toContain('contact.html');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
  it('preserves href to aspx conversion in body links', async () => {
    const tempDir = await mkdtemp(resolve(tmpdir(), 'spark-test-'));
    try {
      await writeFile(
        resolve(tempDir, 'index.html'),
        `<html><body><a href="/about.html">About</a><a href="/dir/page.html">Page</a></body></html>`,
      );
      const result = await build({
        plugins: [spark()],
        root: tempDir,
        build: {
          outDir: resolve(tempDir, 'dist'),
        },
        configFile: false,
      });
      const output = result.output;
      const aspxFile = output.find((f) => f.fileName === 'index.aspx');
      expect(aspxFile.source).toContain('href="about.aspx"');
      expect(aspxFile.source).toContain('href="dir/page.aspx"');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});*/
