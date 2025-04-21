@AuraEnabled
public static void stampMetadataRecord(
    String developerName,
    String assetType,
    String filePath,
    String repoOwner,
    String repoName,
    String commitSha,
    String githubUrl,
    String taskName,
    String source,
    String lastDeployedBy,
    Boolean isProduction,
    String appName,
    String recordType,
    String profileName,
    String changeSummary // optional, from AgentForce or similar
) {
    if (!isProduction) {
        System.debug('Skipping CMDT stamping in non-production environment');
        return;
    }

    // === Step 1: Write to current state CMDT ===
    DevAssist_Metadata__mdt current = new DevAssist_Metadata__mdt(
        Developer_Name__c = developerName,
        Asset_Type__c = assetType,
        GitHub_File_Path__c = filePath,
        Repo_Owner__c = repoOwner,
        Repo_Name__c = repoName,
        Last_Commit_Sha__c = commitSha,
        GitHub_File_URL__c = githubUrl,
        Task__c = taskName,
        Source__c = source,
        Last_Deployed_By__c = lastDeployedBy,
        App__c = appName,
        Record_Type__c = recordType,
        Profile__c = profileName
    );
    upsert current Developer_Name__c;

    // === Step 2: Append to history CMDT ===
    String historyKey = String.valueOf(Datetime.now().getTime()) + '_' + commitSha.left(7);

    DevAssist_Metadata_History__mdt history = new DevAssist_Metadata_History__mdt(
        DeveloperName = historyKey,
        Parent_File_Path__c = filePath,
        Commit_Sha__c = commitSha,
        Change_Summary__c = changeSummary,
        Repo_Owner__c = repoOwner,
        Repo_Name__c = repoName,
        Timestamp__c = Datetime.now(),
        App__c = appName,
        Record_Type__c = recordType,
        Profile__c = profileName,
        Task__c = taskName
    );
    insert history;
}
