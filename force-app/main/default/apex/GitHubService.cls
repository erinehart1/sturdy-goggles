// === Apex: GitHubService.cls ===
public with sharing class GitHubService {
    public class PullRequest {
        @AuraEnabled public String title;
        @AuraEnabled public String url;
        @AuraEnabled public String author;
        @AuraEnabled public String mergedAt;
        @AuraEnabled public String commitSha;
        @AuraEnabled public String body;
        @AuraEnabled public List<String> files;
    }

    @AuraEnabled
    public static List<PullRequest> getMergedPRs(String path) {
        String baseUrl = 'callout:CloudFlare_GitHub_Proxy?repo=sturdy-goggles&owner=erinehart1';
        if (String.isNotBlank(path)) {
            baseUrl += '&file=' + EncodingUtil.urlEncode(path, 'UTF-8');
        }

        HttpRequest req = new HttpRequest();
        req.setEndpoint(baseUrl);
        req.setMethod('GET');

        Http http = new Http();
        HttpResponse res = http.send(req);

        List<PullRequest> prs = (List<PullRequest>) JSON.deserialize(res.getBody(), List<PullRequest>.class);
        return prs;
    }

    @AuraEnabled(cacheable=true)
    public static String getUserProfileName() {
        return [SELECT Profile.Name FROM User WHERE Id = :UserInfo.getUserId()].Profile.Name;
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, String> getRecordContext(String recordId) {
        Id record = Id.valueOf(recordId);
        Schema.SObjectType sObjectType = record.getSObjectType();
        Schema.DescribeSObjectResult describeResult = sObjectType.getDescribe();
        System.debug('Incoming recordId: ' + recordId);

        if (!describeResult.isAccessible()) {
            throw new AuraHandledException('You do not have access to this object.');
        }

        String objectName = describeResult.getName();
        String query = 'SELECT RecordTypeId FROM ' + objectName + ' WHERE Id = :recordId LIMIT 1';
        SObject sObj = Database.query(query);

        Id rtId = (Id) sObj.get('RecordTypeId');
        String rtName = '';

        if (rtId != null) {
            rtName = [SELECT Name FROM RecordType WHERE Id = :rtId LIMIT 1].Name;
        }

        Map<String, String> context = new Map<String, String>();
        context.put('recordType', rtName);
        context.put('objectName', objectName);
        return context;
    }

}