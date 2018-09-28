'use strict';
'use console';

/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */

const yaml = require('node-yaml');
const _ = require('lodash');
const display = require('../../lib/display')();
const reply = require('../../lib/reply')();

async function displayClusters(clusters, style) {
    const header = ['cluster', 'host', 'port', 'cluster_manager_type'];
    let parsedClusters = '';

    if (style === 'txt') {
        parsedClusters = await parseClustersTxt(header, clusters);
    } else {
        parsedClusters = await parseClustersPretty(header, clusters);
    }
    await display.display(header, parsedClusters, style);
}

async function parseClustersPretty(header, clusters) {
    const rows = [];
    _.each(clusters, (value, cluster) => {
        const row = [];
        _.each(header, (item) => {
            if (item === 'cluster') {
                row.push(cluster);
            } else {
                row.push(clusters[cluster][item]);
            }
        });
        rows.push(row);
    });
    return rows;
}

async function parseClustersTxt(header, clusters) {
    const rows = [];
    _.each(clusters, (value, cluster) => {
        const row = {};
        _.each(header, (item) => {
            if (item === 'cluster') {
                row.cluster = cluster;
            } else {
                row[item] = clusters[cluster][item];
            }
        });
        rows.push(row);
    });
    return rows;
}

module.exports = (cliConfig) => {
    async function alias() {
        if (cliConfig.remove) {
            reply.green(`> Remove cluster alias ${cliConfig.cluster}`);
            delete cliConfig.config.clusters[cliConfig.cluster];
        } else {
            reply.green(`> Added cluster alias ${cliConfig.cluster}`);
            const newClusterAlias = {};
            newClusterAlias[cliConfig.cluster] = {
                host: cliConfig.host,
                port: cliConfig.port,
                cluster_manager_type: cliConfig.cluster_manager_type,
            };
            cliConfig.config.clusters[cliConfig.cluster] = {
                host: cliConfig.host,
                port: cliConfig.port,
                cluster_manager_type: cliConfig.cluster_manager_type,
            };
        }
        yaml.writeSync(cliConfig.configFile, cliConfig.config);
        await list();
    }

    async function list() {
        await displayClusters(cliConfig.config.clusters, cliConfig.output_style);
    }

    return {
        list,
        alias
    };
};