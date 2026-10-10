// Copyright (c) John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

// The File System Access API lets the browser remember a file that the user picked, so that
// "Save Song" can write back into that same file instead of downloading a new copy every time.
// Not all browsers support it yet, so every function in this file falls back gracefully.

interface WritableFileStream {
	write(data: string): Promise<void>;
	close(): Promise<void>;
}

interface PermissionDescriptor {
	mode: string;
}

interface FilePickerAcceptType {
	description?: string;
	accept: { [mimeType: string]: string[] };
}

// The TypeScript DOM library knows about FileSystemFileHandle but not about the file pickers or
// createWritable, so the members that are needed here are described locally. The pickers are
// accessed through window because the library doesn't declare them at all.
interface FileHandle {
	name: string;
	getFile(): Promise<File>;
	createWritable(): Promise<WritableFileStream>;
	queryPermission(descriptor: PermissionDescriptor): Promise<string>;
	requestPermission(descriptor: PermissionDescriptor): Promise<string>;
}

export interface OpenedFile {
	handle: FileHandle;
	file: File;
}

const songFileType: FilePickerAcceptType = {description: "BeepBox song", accept: {"application/json": [".json"]}};
const defaultFileName: string = "BeepBox-Song";

let currentFileHandle: FileHandle | null = null;

function _isAbortError(error: any): boolean {
	return error != null && typeof error == "object" && error.name == "AbortError";
}

function _stripExtension(fileName: string): string {
	const extensionIndex: number = fileName.lastIndexOf(".");
	return (extensionIndex > 0) ? fileName.slice(0, extensionIndex) : fileName;
}

export function isFileSystemAccessSupported(): boolean {
	return typeof (<any>window).showOpenFilePicker == "function" && typeof (<any>window).showSaveFilePicker == "function";
}

// The name of the file that's currently open, or null if no file was opened with the File System
// Access API. This handle only lives as long as the page does; it is never saved to storage.
export function getCurrentFileName(): string | null {
	return (currentFileHandle == null) ? null : currentFileHandle.name;
}

// A file name suitable for suggesting in save dialogs and export prompts, without an extension.
export function getSuggestedFileName(): string {
	return (currentFileHandle == null) ? defaultFileName : _stripExtension(currentFileHandle.name);
}

export function forgetCurrentFile(): void {
	currentFileHandle = null;
}

export async function promptToOpenFile(): Promise<OpenedFile | null> {
	if (typeof (<any>window).showOpenFilePicker != "function") return null;
	
	let handle: FileHandle;
	try {
		const handles: FileHandle[] = await (<any>window).showOpenFilePicker({multiple: false, types: [songFileType]});
		handle = handles[0];
	} catch (error) {
		// The user dismissed the dialog, which isn't a failure.
		if (_isAbortError(error)) return null;
		throw error;
	}
	if (handle == null) return null;
	
	const file: File = await handle.getFile();
	currentFileHandle = handle;
	return {handle, file};
}

async function _tryWrite(handle: FileHandle, contents: string): Promise<boolean> {
	try {
		if (typeof handle.queryPermission == "function") {
			let permission: string = await handle.queryPermission({mode: "readwrite"});
			if (permission != "granted" && typeof handle.requestPermission == "function") {
				permission = await handle.requestPermission({mode: "readwrite"});
			}
			if (permission != "granted") return false;
		}
		const writable: WritableFileStream = await handle.createWritable();
		await writable.write(contents);
		await writable.close();
		return true;
	} catch (error) {
		// The file may have been moved or deleted, or its permission may have been revoked.
		return false;
	}
}

// Writes the contents to the currently open file, or asks the user for a file if there isn't one
// (or if forceNewPicker is true). Returns false if the user dismissed the dialog.
export async function saveStringToFile(contents: string, forceNewPicker: boolean): Promise<boolean> {
	if (!isFileSystemAccessSupported()) return false;
	
	if (!forceNewPicker && currentFileHandle != null) {
		if (await _tryWrite(currentFileHandle, contents)) return true;
		// Fall through and ask for a new file, since this one can't be written anymore.
	}
	
	let handle: FileHandle;
	try {
		handle = await (<any>window).showSaveFilePicker({
			suggestedName: getSuggestedFileName() + ".json",
			types: [songFileType],
		});
	} catch (error) {
		if (_isAbortError(error)) return false;
		throw error;
	}
	
	if (!(await _tryWrite(handle, contents))) return false;
	currentFileHandle = handle;
	return true;
}
