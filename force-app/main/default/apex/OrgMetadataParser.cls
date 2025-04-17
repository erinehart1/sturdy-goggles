public with sharing class OrgMetadataParser {
    @AuraEnabled(cacheable=true)
    public static MetadataInfo getMetadataInfo() {
        String componentName = 'Admissions_Timeline';

        List<DevAssist_Metadata__mdt> results = [
            SELECT Asset_Type__c, Source__c, Task__c, GitHub_File_Path__c, GitHub_File_Url__c
            FROM DevAssist_Metadata__mdt
            WHERE DeveloperName = :componentName
        ];

        if (!results.isEmpty()) {
            DevAssist_Metadata__mdt record = results[0];
            return new MetadataInfo(
                record.Source__c,
                record.Task__c,
                record.GitHub_File_Path__c,
                record.GitHub_File_Url__c,
                false
            );
        }

        return new MetadataInfo('template', null, 'unknown', null, true);
    }

    public class MetadataInfo {
        @AuraEnabled public String source;
        @AuraEnabled public String task;
        @AuraEnabled public String file;
        @AuraEnabled public String fileUrl;
        @AuraEnabled public Boolean fallback;

        public MetadataInfo(String source, String task, String file, String fileUrl, Boolean fallback) {
            this.source = source;
            this.task = task;
            this.file = file;
            this.fileUrl = fileUrl;
            this.fallback = fallback;
        }
    }
}