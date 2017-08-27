import fetch from 'isomorphic-fetch';
import url from 'url';
import { ThunkAction as ReduxThunkAction } from 'redux-thunk';

import { load as loadGist, save as saveGist } from './gist';
import { getCrateType, runAsTest } from './selectors';
import { Page, Editor, Orientation, AssemblyFlavor, Channel, Mode } from './types';
import State from './state';

const routes = {
  compile: { pathname: '/compile' },
  execute: { pathname: '/execute' },
  format: { pathname: '/format' },
  clippy: { pathname: '/clippy' },
  meta: {
    crates: { pathname: '/meta/crates' },
  },
};

type ThunkAction<T = void> = ReduxThunkAction<T, State, {}>;

export function toggleConfiguration(): ToggleConfigurationAction {
  return { type: ActionType.ToggleConfiguration };
}

export function navigateToIndex(): SetPageAction {
  return { type: ActionType.SetPage, page: 'index' };
}

export function navigateToHelp(): SetPageAction {
  return { type: ActionType.SetPage, page: 'help' };
}

export enum ActionType {
  ToggleConfiguration = 'TOGGLE_CONFIGURATION',
  SetPage = 'SET_PAGE',
  ChangeEditor = 'CHANGE_EDITOR',
  ChangeKeybinding = 'CHANGE_KEYBINDING',
  ChangeTheme = 'CHANGE_THEME',
  ChangeOrientation = 'CHANGE_ORIENTATION',
  ChangeAssemblyFlavor = 'CHANGE_ASSEMBLY_FLAVOR',
  ChangeChannel = 'CHANGE_CHANNEL',
  ChangeMode = 'CHANGE_MODE',
  ChangeFocus = 'CHANGE_FOCUS',
  ExecuteRequest = 'EXECUTE_REQUEST',
  ExecuteSucceeded = 'EXECUTE_SUCCEEDED',
  ExecuteFailed = 'EXECUTE_FAILED',
  CompileAssemblyRequest = 'COMPILE_ASSEMBLY_REQUEST',
  CompileAssemblySucceeded = 'COMPILE_ASSEMBLY_SUCCEEDED',
  CompileAssemblyFailed = 'COMPILE_ASSEMBLY_FAILED',
  CompileLlvmIrRequest = 'COMPILE_LLVM_IR_REQUEST',
  CompileLlvmIrSucceeded = 'COMPILE_LLVM_IR_SUCCEEDED',
  CompileLlvmIrFailed = 'COMPILE_LLVM_IR_FAILED',
  CompileMirRequest = 'COMPILE_MIR_REQUEST',
  CompileMirSucceeded = 'COMPILE_MIR_SUCCEEDED',
  CompileMirFailed = 'COMPILE_MIR_FAILED',

  Other = '__never_used__',
}

export type Action =
  | ToggleConfigurationAction
  | SetPageAction
  | ChangeAssemblyFlavorAction
  | ChangeChannelAction
  | ChangeEditorAction
  | ChangeFocusAction
  | ChangeKeybindingAction
  | ChangeModeAction
  | ChangeOrientationAction
  | ChangeThemeAction
  | ExecuteRequestAction
  | ExecuteSucceededAction
  | ExecuteFailedAction
  | CompileAssemblyRequestAction
  | CompileAssemblySucceededAction
  | CompileAssemblyFailedAction
  | CompileLlvmIrRequestAction
  | CompileLlvmIrSucceededAction
  | CompileLlvmIrFailedAction
  | CompileMirRequestAction
  | CompileMirSucceededAction
  | CompileMirFailedAction

  | OtherAction
;

export interface ToggleConfigurationAction {
  type: ActionType.ToggleConfiguration;
}

export interface SetPageAction {
  type: ActionType.SetPage;
  page: Page;
}

export interface ChangeEditorAction {
  type: ActionType.ChangeEditor;
  editor: Editor;
}

export interface ChangeKeybindingAction {
  type: ActionType.ChangeKeybinding;
  keybinding: string;
}

export interface ChangeThemeAction {
  type: ActionType.ChangeTheme;
  theme: string;
}

export interface ChangeOrientationAction {
  type: ActionType.ChangeOrientation;
  orientation: Orientation;
}

export interface ChangeAssemblyFlavorAction {
  type: ActionType.ChangeAssemblyFlavor;
  assemblyFlavor: AssemblyFlavor;
}

export interface ChangeChannelAction {
  type: ActionType.ChangeChannel;
  channel: Channel;
}

export interface ChangeModeAction {
  type: ActionType.ChangeMode;
  mode: Mode;
}

export interface ChangeFocusAction {
  type: ActionType.ChangeFocus;
  focus: string;
}

export interface OtherAction {
  type: ActionType.Other;
}

export function changeEditor(editor): ChangeEditorAction {
  return { type: ActionType.ChangeEditor, editor };
}

export function changeKeybinding(keybinding): ChangeKeybindingAction {
  return { type: ActionType.ChangeKeybinding, keybinding };
}

export function changeTheme(theme): ChangeThemeAction {
  return { type: ActionType.ChangeTheme, theme };
}

export function changeOrientation(orientation): ChangeOrientationAction {
  return { type: ActionType.ChangeOrientation, orientation };
}

export function changeAssemblyFlavor(assemblyFlavor): ChangeAssemblyFlavorAction {
  return { type: ActionType.ChangeAssemblyFlavor, assemblyFlavor };
}

export function changeChannel(channel: Channel): ChangeChannelAction {
  return { type: ActionType.ChangeChannel, channel };
}

export function changeMode(mode: Mode): ChangeModeAction {
  return { type: ActionType.ChangeMode, mode };
}

export function changeFocus(focus): ChangeFocusAction {
  return { type: ActionType.ChangeFocus, focus };
}

export interface ExecuteRequestAction {
  type: ActionType.ExecuteRequest;
}

export interface ExecuteSucceededAction {
  type: ActionType.ExecuteSucceeded;
  stdout?: string;
  stderr?: string;
}

export interface ExecuteFailedAction {
  type: ActionType.ExecuteFailed;
  error?: string;
}

function requestExecute(): ExecuteRequestAction {
  return { type: ActionType.ExecuteRequest };
}

function receiveExecuteSuccess({ stdout, stderr }): ExecuteSucceededAction {
  return { type: ActionType.ExecuteSucceeded, stdout, stderr };
}

function receiveExecuteFailure({ error }): ExecuteFailedAction {
  return { type: ActionType.ExecuteFailed, error };
}

function jsonGet(urlObj) {
  const urlStr = url.format(urlObj);

  return fetchJson(urlStr, {
    method: 'get',
  });
}

function jsonPost(urlObj, body) {
  const urlStr = url.format(urlObj);

  return fetchJson(urlStr, {
    method: 'post',
    body: JSON.stringify(body),
  });
}

function fetchJson(url, args) {
  const { headers = {} } = args;
  headers["Content-Type"] = "application/json";

  return fetch(url, { ...args, headers })
    .catch(error => error)
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        return response.json()
          .catch(e => Promise.reject({ error: e.toString() }))
          .then(j => Promise.reject(j));
      }
    });
}

export function performExecute(): ThunkAction {
  // TODO: Check a cache
  return function (dispatch, getState) {
    dispatch(requestExecute());

    const state = getState();
    const { code, configuration: { channel, mode } } = state;
    const crateType = getCrateType(state);
    const tests = runAsTest(state);

    const body = { channel, mode, crateType, tests, code };

    return jsonPost(routes.execute, body)
      .then(json => dispatch(receiveExecuteSuccess(json)))
      .catch(json => dispatch(receiveExecuteFailure(json)));
  };
}

function performCompile(target, { request, success, failure }): ThunkAction {
  // TODO: Check a cache
  return function (dispatch, getState) {
    dispatch(request());

    const state = getState();
    const { code, configuration: { channel, mode, assemblyFlavor } } = state;
    const crateType = getCrateType(state);
    const tests = runAsTest(state);
    const body = { channel, mode, crateType, tests, code, target, assemblyFlavor };

    return jsonPost(routes.compile, body)
      .then(json => dispatch(success(json)))
      .catch(json => dispatch(failure(json)));
  };
}

export interface CompileRequestAction<T> {
  type: T
}

export interface CompileSucceededAction<T> {
  type: T;
  code?: string;
  stdout?: string;
  stderr?: string;
}

export interface CompileFailedAction<T> {
  type: T;
  error?: string;
}

export type CompileAssemblyRequestAction =
  CompileRequestAction<ActionType.CompileAssemblyRequest>;
export type CompileAssemblySucceededAction =
  CompileSucceededAction<ActionType.CompileAssemblySucceeded>;
export type CompileAssemblyFailedAction =
  CompileFailedAction<ActionType.CompileAssemblyFailed>;

function requestCompileAssembly(): CompileAssemblyRequestAction {
  return { type: ActionType.CompileAssemblyRequest };
}

function receiveCompileAssemblySuccess({ code, stdout, stderr }): CompileAssemblySucceededAction {
  return { type: ActionType.CompileAssemblySucceeded, code, stdout, stderr };
}

function receiveCompileAssemblyFailure({ error }): CompileAssemblyFailedAction {
  return { type: ActionType.CompileAssemblyFailed, error };
}

export const performCompileToAssembly = () =>
  performCompile('asm', {
    request: requestCompileAssembly,
    success: receiveCompileAssemblySuccess,
    failure: receiveCompileAssemblyFailure,
  });

export type CompileLlvmIrRequestAction =
  CompileRequestAction<ActionType.CompileLlvmIrRequest>;
export type CompileLlvmIrSucceededAction =
  CompileSucceededAction<ActionType.CompileLlvmIrSucceeded>;
export type CompileLlvmIrFailedAction =
  CompileFailedAction<ActionType.CompileLlvmIrFailed>;

function requestCompileLlvmIr(): CompileLlvmIrRequestAction {
  return { type: ActionType.CompileLlvmIrRequest };
}

function receiveCompileLlvmIrSuccess({ code, stdout, stderr }): CompileLlvmIrSucceededAction {
  return { type: ActionType.CompileLlvmIrSucceeded, code, stdout, stderr };
}

function receiveCompileLlvmIrFailure({ error }): CompileLlvmIrFailedAction {
  return { type: ActionType.CompileLlvmIrFailed, error };
}

export const performCompileToLLVM = () =>
  performCompile('llvm-ir', {
    request: requestCompileLlvmIr,
    success: receiveCompileLlvmIrSuccess,
    failure: receiveCompileLlvmIrFailure,
  });

export type CompileMirRequestAction =
  CompileRequestAction<ActionType.CompileMirRequest>;
export type CompileMirSucceededAction =
  CompileSucceededAction<ActionType.CompileMirSucceeded>;
export type CompileMirFailedAction =
  CompileFailedAction<ActionType.CompileMirFailed>;

function requestCompileMir(): CompileMirRequestAction {
  return { type: ActionType.CompileMirRequest };
}

function receiveCompileMirSuccess({ code, stdout, stderr }): CompileMirSucceededAction {
  return { type: ActionType.CompileMirSucceeded, code, stdout, stderr };
}

function receiveCompileMirFailure({ error }): CompileMirFailedAction {
  return { type: ActionType.CompileMirFailed, error };
}

export const performCompileToMir = () =>
  performCompile('mir', {
    request: requestCompileMir,
    success: receiveCompileMirSuccess,
    failure: receiveCompileMirFailure,
  });

export const EDIT_CODE = 'EDIT_CODE';
export const GOTO_POSITION = 'GOTO_POSITION';

export function editCode(code) {
  return { type: EDIT_CODE, code };
}

export function gotoPosition(line, column) {
  return { type: GOTO_POSITION, line: +line, column: +column };
}

export const REQUEST_FORMAT = 'REQUEST_FORMAT';
export const FORMAT_SUCCEEDED = 'FORMAT_SUCCEEDED';
export const FORMAT_FAILED = 'FORMAT_FAILED';

function requestFormat() {
  return { type: REQUEST_FORMAT };
}

function receiveFormatSuccess({ code }) {
  return { type: FORMAT_SUCCEEDED, code };
}

function receiveFormatFailure({ error }) {
  return { type: FORMAT_FAILED, error };
}

export function performFormat(): ThunkAction {
  // TODO: Check a cache
  return function (dispatch, getState) {
    dispatch(requestFormat());

    const { code } = getState();
    const body = { code };

    return jsonPost(routes.format, body)
      .then(json => dispatch(receiveFormatSuccess(json)))
      .catch(json => dispatch(receiveFormatFailure(json)));
  };
}

export const REQUEST_CLIPPY = 'REQUEST_CLIPPY';
export const CLIPPY_SUCCEEDED = 'CLIPPY_SUCCEEDED';
export const CLIPPY_FAILED = 'CLIPPY_FAILED';

function requestClippy() {
  return { type: REQUEST_CLIPPY };
}

function receiveClippySuccess({ stdout, stderr }) {
  return { type: CLIPPY_SUCCEEDED, stdout, stderr };
}

function receiveClippyFailure({ error }) {
  return { type: CLIPPY_FAILED, error };
}

export function performClippy(): ThunkAction {
  // TODO: Check a cache
  return function (dispatch, getState) {
    dispatch(requestClippy());

    const { code } = getState();
    const body = { code };

    return jsonPost(routes.clippy, body)
      .then(json => dispatch(receiveClippySuccess(json)))
      .catch(json => dispatch(receiveClippyFailure(json)));
  };
}

export const REQUEST_GIST_LOAD = 'REQUEST_GIST_LOAD';
export const GIST_LOAD_SUCCEEDED = 'GIST_LOAD_SUCCEEDED';
export const GIST_LOAD_FAILED = 'GIST_LOAD_FAILED';

function requestGistLoad() {
  return { type: REQUEST_GIST_LOAD };
}

function receiveGistLoadSuccess({ id, url, code }) {
  return { type: GIST_LOAD_SUCCEEDED, id, url, code };
}

function receiveGistLoadFailure() { // eslint-disable-line no-unused-vars
  return { type: GIST_LOAD_FAILED };
}

export function performGistLoad(id): ThunkAction {
  return function (dispatch, _getState) {
    dispatch(requestGistLoad());

    loadGist(id)
      .then(gist => dispatch(receiveGistLoadSuccess({ ...gist })));
    // TODO: Failure case
  };
}

export const REQUEST_GIST_SAVE = 'REQUEST_GIST_SAVE';
export const GIST_SAVE_SUCCEEDED = 'GIST_SAVE_SUCCEEDED';
export const GIST_SAVE_FAILED = 'GIST_SAVE_FAILED';

function requestGistSave() {
  return { type: REQUEST_GIST_SAVE };
}

function receiveGistSaveSuccess({ id, url, channel }) {
  return { type: GIST_SAVE_SUCCEEDED, id, url, channel };
}

function receiveGistSaveFailure({ error }) { // eslint-disable-line no-unused-vars
  return { type: GIST_SAVE_FAILED, error };
}

export function performGistSave() {
  return function (dispatch, getState): ThunkAction {
    dispatch(requestGistSave());

    const { code, configuration: { channel } } = getState();

    return saveGist(code)
      .then(json => dispatch(receiveGistSaveSuccess({ ...json, channel })));
    // TODO: Failure case
  };
}

export const REQUEST_CRATES_LOAD = 'REQUEST_CRATES_LOAD';
export const CRATES_LOAD_SUCCEEDED = 'CRATES_LOAD_SUCCEEDED';

function requestCratesLoad() {
  return { type: REQUEST_CRATES_LOAD };
}

function receiveCratesLoadSuccess({ crates }) {
  return { type: CRATES_LOAD_SUCCEEDED, crates };
}

export function performCratesLoad(): ThunkAction {
  return function(dispatch) {
    dispatch(requestCratesLoad());

    return jsonGet(routes.meta.crates)
      .then(json => dispatch(receiveCratesLoadSuccess(json)));
    // TODO: Failure case
  };
}

function parseChannel(s: string): Channel | null {
  switch (s) {
  case "stable":
    return Channel.Stable;
  case "beta":
    return Channel.Beta;
  case "nightly":
    return Channel.Nightly;
  default:
    return null;
  }
}

function parseMode(s: string): Mode | null {
  switch (s) {
  case "debug":
    return Mode.Debug;
  case "release":
    return Mode.Release;
  default:
    return null;
  }
}

export function indexPageLoad({ code, gist, version = 'stable', mode: modeString = 'debug' }): ThunkAction {
  return function (dispatch) {
    dispatch(navigateToIndex());

    if (code) {
      dispatch(editCode(code));
    } else if (gist) {
      dispatch(performGistLoad(gist));
    }

    if (version) {
      const channel = parseChannel(version);
      if (channel) { dispatch(changeChannel(channel)) };
    }

    if (modeString) {
      const mode = parseMode(modeString);
      if (mode) { dispatch(changeMode(mode)) };
    }
  };
}

export function helpPageLoad() {
  return navigateToHelp();
}

export function showExample(code): ThunkAction {
  return function (dispatch) {
    dispatch(navigateToIndex());
    dispatch(editCode(code));
  };
}
