# === .github/scripts/create-history-cmdt.js ===
const { execSync } = require('child_process');

function safeExec(cmd, fallback = '') {
  try {
    return execSync(cmd).toString().trim();
  } catch {
    return fallback;
  }
}

const commitSha = safeExec('git rev-parse HEAD');
const deployer = safeExec('git config user.name', 'GitHub Action');
const taskName = safeExec('git log -1 --pretty=%s', 'Unknown Task');
const filePath = safeExec('git diff-tree --no-commit-id --name-only -r ' + commitSha, 'Unknown File');

const historyRecord = {
  DeveloperName: `Hist_${Date.now()}`,
  Label: `Change - ${new Date().toISOString()}`,
  GitHub_Commit_Sha__c: commitSha,
  Task_Name__c: taskName,
  Deployed_By__c: deployer,
  Deployed_At__c: new Date().toISOString(),
  GitHub_File_Path__c: filePath
};

const cmd = `sfdx force:data:record:create -s DevAssist_Metadata_History__mdt ${Object.entries(historyRecord)
  .map(([k,v]) => `-v ${k}='${v}'`).join(' ')}`;

console.log('Running:', cmd);
execSync(cmd, { stdio: 'inherit' });