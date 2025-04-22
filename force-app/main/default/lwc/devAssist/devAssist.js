// === LWC: devAssist.js (updated for dynamic context + helper) ===
import { LightningElement, track } from 'lwc';
import getMergedPRs from '@salesforce/apex/GitHubService.getMergedPRs';
import getUserProfileName from '@salesforce/apex/GitHubService.getUserProfileName';
import getRecordContext from '@salesforce/apex/GitHubService.getRecordContext';

export default class DevAssist extends LightningElement {
    @track recordId;
    @track pullRequests;
    @track userProfile;
    @track recordContext;

    _pathsBuilt = false;

    connectedCallback() {
        getUserProfileName()
            .then(profile => {
                this.userProfile = profile;
                this.tryBuildPaths();
            })
            .catch(error => console.error('Error fetching profile:', error));

        const pageRef = window.location.href;
        const pathMatch = pageRef.match(/\/r\/[^/]+\/([a-zA-Z0-9]+)\//);
        if (pathMatch) {
            this.recordId = pathMatch[1];
            console.log(this.recordId);
            getRecordContext({ recordId: this.recordId })
            .then(context => {
                this.recordContext = context;
                this.tryBuildPaths();
            })
            .catch(error => console.error('Error fetching record context:', error));        
        } else {
            console.warn('No recordId found in URL path');
        }
    }

    tryBuildPaths() {
        if (this.userProfile && this.recordContext && !this._pathsBuilt) {
            const { objectName, recordType } = this.recordContext;
            this.buildMetadataPaths(objectName, recordType);
            this._pathsBuilt = true;
        } else {
            console.log('Cannot build paths, missing data:', {
                userProfile: this.userProfile,
                recordContext: this.recordContext
            });
        }
    }

    buildMetadataPaths(objectName, recordType) {
        const paths = [];
        const roots = ['force-app/main/default', 'unpackaged/core', 'unpackaged/ui'];

        for (const root of roots) {
            // Object fields directory
            paths.push(`${root}/objects/${objectName}/fields/`);

            // RecordType metadata
            if (recordType) {
                const metadataType = 'recordTypes';
                const metadataName = recordType;
                const metadataExtension = 'recordType-meta.xml';
                paths.push(`${root}/objects/${objectName}/${metadataType}/${metadataName}.${metadataExtension}`);
            }

            // Layout and Flexipage metadata
            if (this.userProfile) {
                const metadataType = 'flexipages';
                const metadataName = `${objectName}_${recordType}_${this.userProfile}`;
                const metadataExtension = 'flexipage-meta.xml';
                paths.push(`${root}/${metadataType}/${metadataName}.${metadataExtension}`);

                const layoutType = 'layouts';
                const layoutName = `${objectName}-${this.userProfile}`;
                const layoutExtension = 'layout-meta.xml';
                paths.push(`${root}/${layoutType}/${layoutName}.${layoutExtension}`);
            }
        }

        console.log('Generated paths:', paths);
        this.loadPullRequestsForPaths(paths);
    }

    loadPullRequestsForPaths(paths) {
        console.log('Loading PRs for paths:', paths);
        const allRequests = paths.map(p =>
            getMergedPRs({ path: p }) // ✅ Fix: wrap param in object
                .then(data => ({ path: p, data }))
                .catch(error => {
                    console.warn('Error fetching PRs for', p, error);
                    return null;
                })
        );

        Promise.all(allRequests).then(results => {
            const allPRs = [];

            results.forEach(result => {
                if (result && result.data) {
                    result.data.forEach(pr => {
                        const fileLinks = (pr.files || []).map(f => ({
                            name: f,
                            url: `https://github.com/erinehart1/sturdy-goggles/blob/main/${f}`
                        }));
                        console.log('Current URL:', window.location.href);
                        allPRs.push({
                            ...pr,
                            fileLinks
                        });
                    });
                }
            });

            console.log('All PRs:', allPRs);
            this.pullRequests = allPRs;
        });
    }
}