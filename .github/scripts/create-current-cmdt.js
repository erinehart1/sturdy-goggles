const { execSync } = require('child_process');

const currentCmdt = {
  Developer_Name__c: 'My_Component',
  Asset_Type__c: 'LWC',
  GitHub_File_Path__c: 'force-app/main/default/lwc/myComponent/myComponent.js-meta.xml',
  Repo_Owner__c: 'erinehart1',
  Repo_Name__c: 'my-metadata-repo',
  Last_Commit_Sha__c: 'abc123def456',
  GitHub_File_URL__c: 'https://github.com/erinehart1/my-metadata-repo/blob/main/force-app/main/default/lwc/myComponent/myComponent.js-meta.xml',
  Task__c: 'Task 42',
  Source__c: 'GitHub Action',
  Last_Deployed_By__c: 'erinehart1@example.com'
};

const cmd = `sfdx force:data:record:create -s DevAssist_Metadata__mdt ${Object.entries(currentCmdt)
  .map(([k, v]) => `-v ${k}='${v}'`).join(' ')}`;

console.log('Running:', cmd);
execSync(cmd, { stdio: 'inherit' });