import atLibModels from '~models';
import atLibComponents from '~components';

import Strings from '~features/jobs/jobs.strings';
import Controller from '~features/jobs/index.controller';
import PageService from '~features/jobs/page.service';

const Template = require('~features/jobs/index.view.html');

const MODULE_NAME = 'at.features.jobs';
const PAGE_CACHE = true;
const PAGE_LIMIT = 3;
const PAGE_SIZE = 100;
const WS_PREFIX = 'ws';

function resolveResource (Job, ProjectUpdate, AdHocCommand, SystemJob, WorkflowJob, $stateParams) {
    const { id, type } = $stateParams;

    let Resource;
    let related = 'events';

    switch (type) {
        case 'project':
            Resource = ProjectUpdate;
            break;
        case 'playbook':
            Resource = Job;
            related = 'job_events';
            break;
        case 'command':
            Resource = AdHocCommand;
            break;
        case 'system':
            Resource = SystemJob;
            break;
        case 'workflow':
            Resource = WorkflowJob;
            break;
        default:
            // Redirect
            return null;
    }

    return new Resource('get', id)
        .then(model => model.extend(related, {
            pageCache: PAGE_CACHE,
            pageLimit: PAGE_LIMIT,
            params: {
                page_size: PAGE_SIZE,
                order_by: 'start_line'
            }
        }))
        .then(model => {
            return {
                id,
                type,
                model,
                related,
                ws: {
                    namespace: `${WS_PREFIX}-${getWebSocketResource(type).key}-${id}`
                },
                page: {
                    cache: PAGE_CACHE,
                    size: PAGE_SIZE,
                    pageLimit: PAGE_LIMIT
                }
            };
        });
}

function resolveWebSocketConnection (SocketService, $stateParams) {
    const { type, id } = $stateParams;
    const resource = getWebSocketResource(type);

    let name;
    let events;

    const state = {
        data: {
            socket: {
                groups: {
                    [resource.name]: ['status_changed', 'summary'],
                    [resource.key]: []
                }
            }
        }
    };

    SocketService.addStateResolve(state, id);
}

function resolveBreadcrumb (strings) {
    return {
        label: strings.get('state.TITLE')
    };
}

function getWebSocketResource (type) {
    let name;
    let key;

    switch (type) {
        case 'system':
            name = 'system_jobs';
            key = 'system_job_events';
            break;
        case 'project':
            name = 'project_updates';
            key = 'project_update_events';
            break;
        case 'command':
            name = 'ad_hoc_commands';
            key = 'ad_hoc_command_events';
            break;
        case 'inventory':
            name = 'inventory_updates';
            key = 'inventory_update_events';
            break;
        case 'playbook':
            name = 'jobs';
            key = 'job_events';
            break;
    }

    return { name, key };
}


function JobsRun ($stateRegistry) {
    const state = {
        name: 'jobz',
        url: '/jobz/:type/:id',
        route: '/jobz/:type/:id',
        data: {
            activityStream: true,
            activityStreamTarget: 'jobs'
        },
        views: {
            '@': {
                templateUrl: Template,
                controller: Controller,
                controllerAs: 'vm'
            }
        },
        resolve: {
            resource: [
                'JobModel',
                'ProjectUpdateModel',
                'AdHocCommandModel',
                'SystemJobModel',
                'WorkflowJobModel',
                '$stateParams',
                resolveResource
            ],
            ncyBreadcrumb: [
                'JobStrings',
                resolveBreadcrumb
            ],
            webSocketConnection: [
                'SocketService',
                '$stateParams',
                resolveWebSocketConnection
            ]
        },
    };

    $stateRegistry.register(state);
}

JobsRun.$inject = ['$stateRegistry'];

angular
    .module(MODULE_NAME, [
        atLibModels,
        atLibComponents
    ])
    .service('JobStrings', Strings)
    .service('JobPageService', PageService)
    .run(JobsRun);

export default MODULE_NAME;