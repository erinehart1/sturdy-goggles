// 
public with sharing class GitHubService {
    public class PullRequest {
        @AuraEnabled public String title;
        @AuraEnabled public String url;
        @AuraEnabled public String author;
        @AuraEnabled public String mergedAt;
        @AuraEnabled public String commitSha;
    }

    @AuraEnabled(cacheable=true)
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
}