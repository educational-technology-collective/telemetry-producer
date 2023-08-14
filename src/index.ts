import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  INotebookTracker,
  NotebookPanel
} from '@jupyterlab/notebook';

import { ITelemetryRouter } from 'telemetry-router';

import { requestAPI } from './handler';

import { ETCJupyterLabTelemetryLibrary } from './library';

import { INotebookEventMessage } from './types';

// import {
//   producerCollection,
// } from './events';

const PLUGIN_ID = 'telemetry-producer:plugin';

const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  description: 'A JupyterLab extension.',
  autoStart: true,
  requires: [
    ITelemetryRouter,
    INotebookTracker
  ],
  activate: async (
    app: JupyterFrontEnd,
    telemetryRouter: ITelemetryRouter,
    notebookTracker: INotebookTracker
  ) => {
    const version = await requestAPI<string>('version')
    console.log(`${PLUGIN_ID}: ${version}`)

    const config = await requestAPI<any>('config')
    notebookTracker.widgetAdded.connect((notebookTracker: INotebookTracker, notebookPanel: NotebookPanel) => {
      const eventLibrary = new ETCJupyterLabTelemetryLibrary({ notebookPanel, config })
      const signals = [
        eventLibrary.activeCellChangeEvent.activeCellChanged,
        eventLibrary.cellAddEvent.cellAdded,
        eventLibrary.cellErrorEvent.cellErrored,
        eventLibrary.cellExecutionEvent.cellExecuted,
        eventLibrary.cellRemoveEvent.cellRemoved,
        eventLibrary.notebookClipboardEvent.notebookClipboardCopied,
        eventLibrary.notebookClipboardEvent.notebookClipboardCut,
        eventLibrary.notebookClipboardEvent.notebookClipboardPasted,
        eventLibrary.notebookCloseEvent.notebookClosed,
        eventLibrary.notebookOpenEvent.notebookOpened,
        eventLibrary.notebookSaveEvent.notebookSaved,
        eventLibrary.notebookVisibilityEvent.notebookHidden,
        eventLibrary.notebookVisibilityEvent.notebookVisible,
        eventLibrary.notebookScrollEvent.notebookScrolled
      ];

      telemetryRouter.loadNotebookPanel(notebookPanel)
      signals.forEach((signal) => signal.connect(
        (_, message: INotebookEventMessage) => {
          const eventDetail = {
            eventName: message.eventName,
            cells: message.cells,
            kernelError: message.kernelError, //  For cellErrored event.
            selection: message.selection, //  For notebookClipboard event.
            environ: message.environ,  //  For openNotebook event.
          }
          const logNotebookContent:boolean = config.logNotebookContentEvents.includes(message.eventName)
          telemetryRouter.publishEvent(eventDetail, logNotebookContent)
        }
      ))

      // producerCollection.forEach((producer) => {
      //   if (config.includes(producer.id)) {
      //     new producer().listen(notebookTracker, telemetryRouter)
      //   }
      // })
    }
    )
  }
};

export default plugin;
