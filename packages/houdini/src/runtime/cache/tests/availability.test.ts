import { test, expect, vi } from 'vitest'

import { testConfigFile } from '../../../test'
import type { SubscriptionSelection } from '../../lib'
import { Cache } from '../cache'

const config = testConfigFile()

test('not partial', function () {
	// instantiate the cache
	const cache = new Cache(config)

	const selection: SubscriptionSelection = {
		fields: {
			viewer: {
				type: 'User',
				visible: true,
				keyRaw: 'viewer',
				selection: {
					fields: {
						id: {
							type: 'ID',
							visible: true,
							keyRaw: 'id',
						},
						firstName: {
							type: 'String',
							visible: true,
							keyRaw: 'firstName',
						},
						friends: {
							type: 'User',
							visible: true,
							keyRaw: 'friends',
							nullable: true,
							selection: {
								fields: {
									id: {
										type: 'ID',
										visible: true,
										keyRaw: 'id',
									},
									firstName: {
										type: 'String',
										visible: true,
										keyRaw: 'firstName',
									},
								},
							},
						},
					},
				},
			},
		},
	}

	// make sure we can't resolve it already
	expect(cache.read({ selection })).toMatchObject({
		data: null,
		partial: false,
	})

	// add some data to the cache
	cache.write({
		selection,
		data: {
			viewer: {
				id: '1',
				firstName: 'bob',
				friends: [
					{
						id: '2',
						firstName: 'jane',
					},
					null,
				],
			},
		},
	})

	// make sure we can't resolve it already
	expect(cache.read({ selection })).toMatchObject({
		partial: false,
	})
})

test('not partial with empty list', function () {
	// instantiate the cache
	const cache = new Cache(config)

	const selection: SubscriptionSelection = {
		fields: {
			viewer: {
				type: 'User',
				visible: true,
				keyRaw: 'viewer',
				selection: {
					fields: {
						id: {
							type: 'ID',
							visible: true,
							keyRaw: 'id',
						},
						firstName: {
							type: 'String',
							visible: true,
							keyRaw: 'firstName',
						},
						friends: {
							type: 'User',
							visible: true,
							keyRaw: 'friends',
							selection: {
								fields: {
									id: {
										type: 'ID',
										visible: true,
										keyRaw: 'id',
									},
									firstName: {
										type: 'String',
										visible: true,
										keyRaw: 'firstName',
									},
								},
							},
						},
					},
				},
			},
		},
	}

	// make sure we can't resolve it already
	expect(cache.read({ selection })).toMatchObject({
		data: null,
		partial: false,
	})

	// add some data to the cache
	cache.write({
		selection,
		data: {
			viewer: {
				id: '1',
				firstName: 'bob',
				friends: [],
			},
		},
	})

	// make sure we get the right partial status
	expect(cache.read({ selection })).toMatchObject({
		partial: false,
	})
})

test('partial with missing linked record', function () {
	// instantiate the cache
	const cache = new Cache(config)

	const selection: SubscriptionSelection = {
		fields: {
			viewer: {
				type: 'User',
				visible: true,
				keyRaw: 'viewer',
				selection: {
					fields: {
						id: {
							type: 'ID',
							visible: true,
							keyRaw: 'id',
						},
						firstName: {
							type: 'String',
							visible: true,
							keyRaw: 'firstName',
						},
						parent: {
							type: 'User',
							visible: true,
							keyRaw: 'parent',
							selection: {
								fields: {
									id: {
										type: 'ID',
										visible: true,
										keyRaw: 'id',
									},
									firstName: {
										type: 'String',
										visible: true,
										keyRaw: 'firstName',
									},
								},
							},
						},
					},
				},
			},
		},
	}

	// make sure we can't resolve it already
	expect(cache.read({ selection })).toMatchObject({
		data: null,
		partial: false,
	})

	// add some data to the cache
	cache.write({
		selection,
		data: {
			viewer: {
				id: '1',
				firstName: 'bob',
			},
		},
	})

	// make sure we get the right partial status
	expect(cache.read({ selection })).toMatchObject({
		partial: true,
	})
})

test('partial with missing single field', function () {
	// instantiate the cache
	const cache = new Cache(config)

	const selection: SubscriptionSelection = {
		fields: {
			viewer: {
				type: 'User',
				visible: true,
				keyRaw: 'viewer',
				selection: {
					fields: {
						id: {
							type: 'ID',
							visible: true,
							keyRaw: 'id',
						},
						firstName: {
							type: 'String',
							visible: true,
							keyRaw: 'firstName',
						},
						friends: {
							type: 'User',
							visible: true,
							keyRaw: 'friends',
							selection: {
								fields: {
									id: {
										type: 'ID',
										visible: true,
										keyRaw: 'id',
									},
									firstName: {
										type: 'String',
										visible: true,
										keyRaw: 'firstName',
									},
								},
							},
						},
					},
				},
			},
		},
	}

	// add some data to the cache
	cache.write({
		selection,
		data: {
			viewer: {
				id: '1',
				friends: [],
			},
		},
	})

	expect(cache.read({ selection })).toMatchObject({
		partial: true,
	})
})

test('partial missing data inside of linked list', function () {
	// instantiate the cache
	const cache = new Cache(config)

	const selection: SubscriptionSelection = {
		fields: {
			viewer: {
				type: 'User',
				visible: true,
				keyRaw: 'viewer',
				selection: {
					fields: {
						id: {
							type: 'ID',
							visible: true,
							keyRaw: 'id',
						},
						friends: {
							type: 'User',
							visible: true,
							keyRaw: 'friends',
							selection: {
								fields: {
									id: {
										type: 'ID',
										visible: true,
										keyRaw: 'id',
									},
									firstName: {
										type: 'String',
										visible: true,
										keyRaw: 'firstName',
									},
								},
							},
						},
					},
				},
			},
		},
	}

	// add some data to the cache with an incomplete set of values for an element
	// inside of a list
	cache.write({
		selection,
		data: {
			viewer: {
				id: '1',
				friends: [{ id: '2', firstName: 'anthony' }, { id: '3' }],
			},
		},
	})

	expect(cache.read({ selection })).toMatchObject({
		partial: true,
	})
})

test('missing cursor of item in connection from operation should not trigger null cascade', function () {
	// instantiate the cache
	const cache = new Cache(config)

	const selection: SubscriptionSelection = {
		fields: {
			viewer: {
				type: 'User',
				visible: true,
				keyRaw: 'viewer',
				selection: {
					fields: {
						id: {
							type: 'ID',
							visible: true,
							keyRaw: 'id',
						},
						friends: {
							type: 'User',
							visible: true,
							keyRaw: 'friends',
							list: {
								name: 'All_Users',
								connection: true,
								type: 'User',
							},
							selection: {
								fields: {
									edges: {
										type: 'UserEdge',
										visible: true,
										keyRaw: 'edges',
										selection: {
											fields: {
												cursor: {
													type: 'Node',
													visible: true,
													keyRaw: 'cursor',
													nullable: false,
												},
												node: {
													type: 'Node',
													visible: true,
													keyRaw: 'node',
													abstract: true,
													selection: {
														fields: {
															__typename: {
																type: 'String',
																visible: true,
																keyRaw: '__typename',
															},
															id: {
																type: 'ID',
																visible: true,
																keyRaw: 'id',
															},
															firstName: {
																type: 'String',
																visible: true,
																keyRaw: 'firstName',
															},
														},
													},
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
	}

	// add some elements to the list already
	cache.write({
		selection,
		data: {
			viewer: {
				id: '1',
				friends: {
					edges: [
						{
							node: {
								__typename: 'User',
								id: '2',
								firstName: 'jane',
							},
						},
					],
				},
			},
		},
	})

	cache.subscribe({
		set: vi.fn(),
		selection,
		rootType: 'Query',
	})

	// add some data to the cache with an incomplete set of values for an element
	// inside of a list
	cache.list('All_Users').prepend(
		{
			fields: {
				__typename: {
					type: 'String',
					visible: true,
					keyRaw: '__typename',
				},
				id: {
					type: 'ID',
					visible: true,
					keyRaw: 'id',
				},
				firstName: {
					type: 'String',
					visible: true,
					keyRaw: 'firstName',
				},
			},
		},
		{
			__typename: 'User',
			id: '2',
			firstName: 'Sally',
		}
	)

	expect(cache.read({ selection })).not.toMatchObject({
		data: {
			viewer: {
				friends: {
					edges: expect.arrayContaining([null]),
				},
			},
		},
	})
})
