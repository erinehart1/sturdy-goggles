public with sharing class MetadataRepoStampController {
    @AuraEnabled
    public static void stampMetadata(
        String filePath,
        String repoOwner,
        String repoName,
        String commitSha,
        String githubUrl,
        String source
    ) 
    {
        if (String.isBlank(filePath)) {
            throw new AuraHandledException('filePath cannot be blank.');
        }

        String metadataName = filePath
            .replace('force-app/main/default/', '')
            .replaceAll('[^a-zA-Z0-9]', '_')
            .toLowerCase();

        DevAssist_Metadata__mdt record = new DevAssist_Metadata__mdt(
            DeveloperName = metadataName,
            Label = metadataName,
            GitHub_File_Path__c = filePath,
            GitHub_File_URL__c = githubUrl,
            Repo_Owner__c = repoOwner,
            Repo_Name__c = repoName,
            Last_Commit_Sha__c = commitSha,
            Source__c = source,
            Last_Deployed_By__c = UserInfo.getUserName()
        );

        // Upsert by DeveloperName so it's idempotent
        upsert record DeveloperName;
    }
}