/**
 * Mock uniCloud database for testing
 * Implements the subset of uniCloud database API used by cloud functions
 */

/**
 * Creates a mock database with in-memory storage
 * @param {Object} initialData - Initial data to seed the mock DB { collectionName: [{ _id: string, ...fields }] }
 * @returns {Object} Mock db object
 */
function createMockDb(initialData = {}) {
  const storage = {};

  // Seed initial data
  if (initialData) {
    for (const [collectionName, docs] of Object.entries(initialData)) {
      storage[collectionName] = JSON.parse(JSON.stringify(docs));
    }
  }

  function createCollection(name) {
    const collectionData = storage[name] || [];

    // Create query builder for where()
    function createQueryBuilder(data) {
      let filtered = [...collectionData];
      const queryData = { ...data };

      // Helper: get nested value from doc by dot-notation path (e.g. "tags.source")
        function getDocValue(doc, path) {
          return path.split('.').reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, doc);
        }

        // Helper: check if doc matches a single condition (field: value or field: {$operator: ...})
        function docMatchesCondition(doc, condition) {
          return Object.keys(condition).every(condKey => {
            const condValue = condition[condKey];
            const docValue = getDocValue(doc, condKey);
            if (condValue instanceof RegExp) {
              return condValue.test(docValue);
            }
            if (typeof condValue === 'object' && condValue !== null) {
              if (condValue.$regex) {
                const regex = new RegExp(condValue.$regex, condValue.$options || '');
                return regex.test(docValue);
              }
              if (condValue.$in) {
                return condValue.$in.includes(docValue);
              }
              if (condValue.$exists !== undefined) {
                return condValue.$exists ? docValue !== undefined : docValue === undefined;
              }
            }
            return docValue === condValue;
          });
        }

        return {
        get() {
          return Promise.resolve({
            data: filtered.filter(doc => {
              // Handle top-level $or
              if (queryData.$or) {
                const orResult = queryData.$or.some(condition => docMatchesCondition(doc, condition));
                // Create a copy without $or for remaining field checks
                const restQuery = { ...queryData };
                delete restQuery.$or;
                if (Object.keys(restQuery).length === 0) {
                  return orResult;
                }
                return orResult && Object.keys(restQuery).every(key => {
                  if (typeof restQuery[key] === 'object' && restQuery[key] !== null) {
                    if (restQuery[key].$regex) {
                      const regex = new RegExp(restQuery[key].$regex, restQuery[key].$options || '');
                      return regex.test(getDocValue(doc, key));
                    }
                    if (restQuery[key].$in) {
                      return restQuery[key].$in.includes(getDocValue(doc, key));
                    }
                    if (restQuery[key].$exists) {
                      return restQuery[key].$exists ? getDocValue(doc, key) !== undefined : getDocValue(doc, key) === undefined;
                    }
                    if (restQuery[key].$and) {
                      return restQuery[key].$and.every(cond => docMatchesCondition(doc, cond));
                    }
                  }
                  return getDocValue(doc, key) === restQuery[key];
                });
              }
              // No $or, normal field matching
              return Object.keys(queryData).every(key => {
                if (typeof queryData[key] === 'object' && queryData[key] !== null) {
                  if (queryData[key].$regex) {
                    const regex = new RegExp(queryData[key].$regex, queryData[key].$options || '');
                    return regex.test(getDocValue(doc, key));
                  }
                  if (queryData[key].$in) {
                    return queryData[key].$in.includes(getDocValue(doc, key));
                  }
                  if (queryData[key].$exists) {
                    return queryData[key].$exists ? getDocValue(doc, key) !== undefined : getDocValue(doc, key) === undefined;
                  }
                  if (queryData[key].$and) {
                    return queryData[key].$and.every(cond => docMatchesCondition(doc, cond));
                  }
                }
                return getDocValue(doc, key) === queryData[key];
              });
            })
          });
        },
        count() {
          return Promise.resolve({
            total: filtered.filter(doc => {
              if (queryData.$or) {
                const orResult = queryData.$or.some(condition => docMatchesCondition(doc, condition));
                const restQuery = { ...queryData };
                delete restQuery.$or;
                if (Object.keys(restQuery).length === 0) {
                  return orResult;
                }
                return orResult && Object.keys(restQuery).every(key => {
                  if (typeof restQuery[key] === 'object' && restQuery[key] !== null) {
                    if (restQuery[key].$regex) {
                      const regex = new RegExp(restQuery[key].$regex, restQuery[key].$options || '');
                      return regex.test(getDocValue(doc, key));
                    }
                    if (restQuery[key].$in) {
                      return restQuery[key].$in.includes(getDocValue(doc, key));
                    }
                    if (restQuery[key].$exists) {
                      return restQuery[key].$exists ? getDocValue(doc, key) !== undefined : getDocValue(doc, key) === undefined;
                    }
                    if (restQuery[key].$and) {
                      return restQuery[key].$and.every(cond => docMatchesCondition(doc, cond));
                    }
                  }
                  return getDocValue(doc, key) === restQuery[key];
                });
              }
              return Object.keys(queryData).every(key => {
                if (typeof queryData[key] === 'object' && queryData[key] !== null) {
                  if (queryData[key].$regex) {
                    const regex = new RegExp(queryData[key].$regex, queryData[key].$options || '');
                    return regex.test(getDocValue(doc, key));
                  }
                  if (queryData[key].$in) {
                    return queryData[key].$in.includes(getDocValue(doc, key));
                  }
                  if (queryData[key].$exists) {
                    return queryData[key].$exists ? getDocValue(doc, key) !== undefined : getDocValue(doc, key) === undefined;
                  }
                  if (queryData[key].$and) {
                    return queryData[key].$and.every(cond => docMatchesCondition(doc, cond));
                  }
                }
                return getDocValue(doc, key) === queryData[key];
              });
            }).length
          });
        },
        limit(n) {
          filtered = filtered.slice(0, n);
          return this;
        },
        skip(n) {
          filtered = filtered.slice(n);
          return this;
        },
        orderBy(field, order) {
          filtered.sort((a, b) => {
            if (order === 'desc') {
              return b[field] > a[field] ? 1 : -1;
            }
            return a[field] > b[field] ? 1 : -1;
          });
          return this;
        }
      };
    }

    return {
      where(query = {}) {
        return createQueryBuilder(query);
      },
      doc(id) {
        return {
          get() {
            const doc = collectionData.find(d => d._id === id);
            return Promise.resolve({ data: doc || null });
          },
          update(data) {
            const index = collectionData.findIndex(d => d._id === id);
            if (index !== -1) {
              collectionData[index] = { ...collectionData[index], ...data };
              return Promise.resolve({ updated: 1 });
            }
            return Promise.resolve({ updated: 0 });
          },
          delete() {
            const index = collectionData.findIndex(d => d._id === id);
            if (index !== -1) {
              collectionData.splice(index, 1);
              return Promise.resolve({ deleted: 1 });
            }
            return Promise.resolve({ deleted: 0 });
          }
        };
      },
      add(data) {
        const id = data._id || 'mock_id_' + Math.random().toString(36).substr(2, 9);
        const newDoc = { _id: id, ...data };
        collectionData.push(newDoc);
        return Promise.resolve({ id });
      },
      limit(n) {
        return {
          get() {
            return Promise.resolve({ data: collectionData.slice(0, n) });
          }
        };
      },
      skip(n) {
        return {
          get() {
            return Promise.resolve({ data: collectionData.slice(n) });
          }
        };
      },
      // For testing: allow direct access to storage
      _getStorage() {
        return collectionData;
      },
      _setStorage(docs) {
        collectionData.length = 0;
        collectionData.push(...docs);
      }
    };
  }

  const db = {
    collection(name) {
      return createCollection(name);
    },
    command: {
      // Mock database command operators
      eq(val) { return { $eq: val }; },
      ne(val) { return { $ne: val }; },
      in(arr) { return { $in: arr }; },
      nin(arr) { return { $nin: arr }; },
      exists(val = true) { return { $exists: val }; },
      or(...queries) { return { $or: queries }; },
      and(...queries) { return { $and: queries }; },
      regex(pattern, options) { return { $regex: pattern, $options: options }; }
    },
    // For testing: access full storage
    _getStorage() {
      return storage;
    },
    _resetStorage() {
      for (const key in storage) {
        delete storage[key];
      }
    }
  };

  return db;
}

module.exports = { createMockDb };
