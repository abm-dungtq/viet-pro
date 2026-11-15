#!/usr/bin/env node
// Thin CLI wrapper — logic lives in ./cli/x-length-cli.mjs
import { runXLengthCli } from './cli/x-length-cli.mjs';

process.exitCode = runXLengthCli(process.argv.slice(2));
