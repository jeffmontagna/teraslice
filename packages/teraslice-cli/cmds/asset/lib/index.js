'use strict';

const _ = require('lodash');
const fs = require('fs-extra');
const archiver = require('archiver');
const Promise = require('bluebird');
const path = require('path');
const TerasliceClient = require('teraslice-client-js');
const reply = require('../../lib/reply')();

module.exports = (cliConfig = {}, _terasliceClient) => {
    const terasliceClient = _terasliceClient || TerasliceClient({
        host: cliConfig.cluster_url
    });

    function _urlCheck(url) {
        // check that url starts with http:// but allow for https://
        return url.indexOf('http') === -1 ? `http://${url}` : url;
    }

    function getAssetClusters() {
        if (cliConfig.c) {
            const cluster = _urlCheck(cliConfig.c);
            cliConfig.cluster = cluster;
        }
        if (cliConfig.l) {
            cliConfig.cluster = 'http://localhost:5678';
        }
        if (!_.has(cliConfig, 'cluster') && _.has(cliConfig, 'asset_file_content.tjm.clusters')) {
            cliConfig.clusters = _.filter(_.get(cliConfig, 'asset_file_content.tjm.clusters', []));
        }
        if (_.isEmpty(cliConfig.clusters) && !_.has(cliConfig, 'cluster')) {
            reply.fatal('Cluster data is missing from asset.json or not specified using -c.');
        }
    }

    function alreadyRegisteredCheck() {
        const jobContents = cliConfig.job_file_content;
        if (_.has(jobContents, 'tjm.cluster')) {
            return terasliceClient.jobs.wrap(jobContents.tjm.job_id).spec()
                .then((jobSpec) => {
                    if (jobSpec.job_id === jobContents.tjm.job_id) {
                        // return true for testing purposes
                        return Promise.resolve(true);
                    }
                    return Promise.reject(new Error('Job is not on the cluster'));
                });
        }
        return Promise.reject(new Error('No cluster configuration for this job'));
    }

    function postAsset(client = terasliceClient) {
        return Promise.resolve()
            .then(() => fs.readFile(path.join(cliConfig.baseDir, '.assetbuild', 'processors.zip')))
            .then(zipFile => client.assets.post(zipFile))
            .then(assetPostResponse => assetPostResponse)
            .then((postResponse) => {
                const postResponseJson = JSON.parse(postResponse);
                if (postResponseJson.error) {
                    return Promise.reject(new Error(postResponseJson.error));
                }
                reply.green(`Asset posted to ${cliConfig.cluster_url} with id ${postResponseJson._id}`);
                return true;
            });
    }

    function createJsonFile(filePath, jsonObject) {
        return fs.writeJson(filePath, jsonObject, { spaces: 4 });
    }

    function latestAssetVersion(assetArray) {
        // this will need to be expanded but good for now
        const orderedByVersion = _.sortBy(assetArray, o => o.version);
        return orderedByVersion[orderedByVersion.length - 1];
    }

    function zipAsset() {
        const zipMessage = {};

        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(path.join(cliConfig.baseDir, '.assetbuild', 'processors.zip'));
            const archive = archiver('zip', {
                zlib: { level: 9 } // Sets the compression level.
            });

            output.on('finish', () => {
                zipMessage.size = `${archive.pointer()}`;
                resolve(zipMessage);
            });

            archive.on('error', (err) => {
                reject(err);
            });

            archive.pipe(output);
            archive
                .directory(path.join(cliConfig.baseDir, 'asset'), 'asset')
                .finalize();
        });
    }

    function updateAssetMetadata() {
        // writes asset metadata to asset.json
        const cluster = cliConfig.cluster_url;
        const assetJson = cliConfig.asset_file_content;

        if (!cluster) {
            throw new Error('Cluster configuration is invalid');
        }

        if (!_.has(assetJson, 'tjm.clusters')) {
            _.set(assetJson, 'tjm.clusters', [cluster]);
        } else if (assetJson.tjm.clusters.indexOf(cluster) === -1) {
            assetJson.tjm.clusters.push(cluster);
        }
        return assetJson;
    }

    return {
        alreadyRegisteredCheck,
        latestAssetVersion,
        createJsonFile,
        getAssetClusters,
        postAsset,
        terasliceClient,
        updateAssetMetadata,
        zipAsset,
    };
};
