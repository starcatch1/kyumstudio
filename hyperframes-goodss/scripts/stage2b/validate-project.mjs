import { loadProject, validateProject } from './project-lib.mjs';

const arg=process.argv[2]||'project.stage2b.json';
const {project,projectDir,projectPath}=await loadProject(arg);
const result=await validateProject(project,{projectDir,checkAssets:true});
console.log(JSON.stringify({ok:result.ok,projectPath,summary:{schemaVersion:project.schemaVersion,id:project.id,quality:project.quality,audio:project.audio,assets:Object.keys(project.assets).length,compositions:project.compositions.map(c=>({id:c.id,width:c.width,height:c.height,fps:c.fps,duration:c.duration,scenes:c.scenes.length}))},errors:result.errors,warnings:result.warnings},null,2));
if(!result.ok) process.exit(2);
