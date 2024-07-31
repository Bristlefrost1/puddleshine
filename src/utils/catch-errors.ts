async function catchPromiseErrors<T>(promise: Promise<T>): Promise<{ result?: T; error?: any }> {
	let result: T | undefined = undefined;
	let error: any = undefined;

	try {
		result = await promise;
	} catch (catchError) {
		error = catchError;
	}

	return { result: result, error: error };
}

export { catchPromiseErrors };
