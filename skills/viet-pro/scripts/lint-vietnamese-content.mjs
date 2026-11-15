#!/usr/bin/env node
// Thin CLI wrapper — logic lives in ./cli/lint-cli.mjs
import { runLintCli } from './cli/lint-cli.mjs';

process.exitCode = runLintCli(process.argv.slice(2));
