import type { SendParams } from '$houdini/runtime/client/documentStore'
import { CachePolicy } from '$houdini/runtime/lib'
import { deepEquals } from '$houdini/runtime/lib/deepEquals'
import type { GraphQLObject, QueryArtifact, QueryResult } from '$houdini/runtime/lib/types'

import { getSession } from '../../session'
import type { QueryStoreFetchParams } from '../query'
import { fetchParams } from '../query'
import type { FetchFn } from './fetch'
import { countPage, missingPageSizeError } from './pageInfo'

export function offsetHandlers<_Data extends GraphQLObject, _Input extends {}>({
	artifact,
	storeName,
	getState,
	getVariables,
	fetch: parentFetch,
	fetchUpdate: parentFetchUpdate,
}: {
	artifact: QueryArtifact
	fetch: FetchFn<_Data, _Input>
	fetchUpdate: (arg: SendParams) => ReturnType<FetchFn<_Data, _Input>>
	storeName: string
	getState: () => _Data | null
	getVariables: () => _Input
}) {
	// we need to track the most recent offset for this handler
	let getOffset = () =>
		(artifact.refetch?.start as number) ||
		countPage(artifact.refetch!.path, getState()) ||
		artifact.refetch!.pageSize

	let currentOffset = getOffset() ?? 0

	return {
		loadNextPage: async ({
			limit,
			offset,
			fetch,
			metadata,
		}: {
			limit?: number
			offset?: number
			fetch?: typeof globalThis.fetch
			metadata?: {}
		} = {}) => {
			// build up the variables to pass to the query
			const queryVariables: Record<string, any> = {
				...getVariables(),
				offset: offset ?? getOffset(),
			}
			if (limit || limit === 0) {
				queryVariables.limit = limit
			}

			// if we made it this far without a limit argument and there's no default page size,
			// they made a mistake
			if (!queryVariables.limit && !artifact.refetch!.pageSize) {
				throw missingPageSizeError('loadNextPage')
			}

			// Get the Pagination Mode
			let isSinglePage = artifact.refetch?.mode === 'SinglePage'

			// send the query
			const targetFetch = isSinglePage ? parentFetch : parentFetchUpdate
			await targetFetch({
				variables: queryVariables as _Input,
				fetch,
				metadata,
				policy: isSinglePage ? artifact.policy : CachePolicy.NetworkOnly,
				session: await getSession(),
			})

			// add the page size to the offset so we load the next page next time
			const pageSize = queryVariables.limit || artifact.refetch!.pageSize
			currentOffset = offset + pageSize
		},
		async fetch(
			args?: QueryStoreFetchParams<_Data, _Input>
		): Promise<QueryResult<_Data, _Input>> {
			const { params } = await fetchParams(artifact, storeName, args)

			const { variables } = params ?? {}

			// if the input is different than the query variables then we just do everything like normal
			if (variables && !deepEquals(getVariables(), variables)) {
				return parentFetch.call(this, params)
			}

			// we are updating the current set of items, count the number of items that currently exist
			// and ask for the full data set
			const count = currentOffset || getOffset()

			// build up the variables to pass to the query
			const queryVariables: Record<string, any> = {}

			// if there are more records than the first page, we need fetch to load everything
			if (!artifact.refetch!.pageSize || count > artifact.refetch!.pageSize) {
				queryVariables.limit = count
			}

			// send the query
			return await parentFetch.call(this, {
				...params,
				variables: queryVariables as _Input,
			})
		},
	}
}
