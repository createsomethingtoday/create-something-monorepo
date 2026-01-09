#!/usr/bin/env node

/**
 * @create-something/orchestration CLI
 *
 * Entry point for the `orch` command.
 */

import { Command } from 'commander';
import { createSessionCommand } from '../cli/session.js';
import { createConvoyCommand } from '../cli/convoy.js';
import { createWorkCommand } from '../cli/work.js';
import { createCostCommand } from '../cli/cost.js';

const program = new Command();

program
  .name('orch')
  .description('CREATE SOMETHING Orchestration Layer')
  .version('0.2.0');

// Add command groups
program.addCommand(createSessionCommand());
program.addCommand(createConvoyCommand());
program.addCommand(createWorkCommand());
program.addCommand(createCostCommand());

// Parse arguments
program.parse(process.argv);
