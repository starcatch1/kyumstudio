import { loadProject, validateProject, projectSummary } from './project-lib.mjs';

const projectArg = process.argv[2] || 'project.json';
const skipAssets = process.argv.includes('--skip-assets');

try {
  const { project, projectDir, projectPath } = await loadProject(projectArg);
  const result = await validateProject(project, { projectDir, checkAssets: !skipAssets });
  const report = {
    ok: result.ok,
    projectPath,
    summary: projectSummary(project),
    errors: result.errors,
    warnings: result.warnings,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!result.ok) process.exit(2);
} catch (error) {
  console.error(`[P2A] Project validation failed: ${error.message}`);
  process.exit(3);
}
