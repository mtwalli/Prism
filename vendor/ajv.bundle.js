/* Prism — CSP-safe JSON Schema validator (draft-07 subset, no new Function) */
"use strict";
var Ajv = (function () {
  function Ajv(opts) {
    this._opts = opts || {};
    this._schemas = {};
  }

  Ajv.prototype.compile = function (schema) {
    var self = this;
    var allErrors = self._opts.allErrors;

    function validate(data) {
      var errors = [];
      validateSchema(schema, data, '', schema, errors, allErrors);
      validate.errors = errors.length ? errors : null;
      return errors.length === 0;
    }
    validate.errors = null;
    return validate;
  };

  Ajv.prototype.addSchema = function () { return this; };
  Ajv.prototype.addMetaSchema = function () { return this; };
  Ajv.prototype.validate = function (schema, data) {
    return this.compile(schema)(data);
  };

  // ── Core recursive validator ───────────────────────────────────────────────
  function validateSchema(schema, data, instancePath, rootSchema, errors, allErrors) {
    if (schema === true) return true;
    if (schema === false) {
      pushError(errors, instancePath, '#', 'false schema', {}, 'schema is false');
      return false;
    }
    if (typeof schema !== 'object' || schema === null) return true;

    var valid = true;

    // $ref
    if (schema.$ref !== undefined) {
      var resolved = resolveRef(schema.$ref, rootSchema);
      if (resolved) {
        var ok = validateSchema(resolved, data, instancePath, rootSchema, errors, allErrors);
        if (!ok) { valid = false; if (!allErrors) return false; }
      }
    }

    // type
    if (schema.type !== undefined) {
      var types = Array.isArray(schema.type) ? schema.type : [schema.type];
      if (!types.some(function (t) { return checkType(t, data); })) {
        pushError(errors, instancePath, '#/type', 'type', { type: schema.type }, 'must be ' + types.join(', '));
        valid = false;
        if (!allErrors) return false;
      }
    }

    // enum
    if (schema.enum !== undefined) {
      if (!schema.enum.some(function (v) { return deepEqual(v, data); })) {
        pushError(errors, instancePath, '#/enum', 'enum', { allowedValues: schema.enum }, 'must be equal to one of the allowed values');
        valid = false;
        if (!allErrors) return false;
      }
    }

    // const
    if (schema.const !== undefined) {
      if (!deepEqual(schema.const, data)) {
        pushError(errors, instancePath, '#/const', 'const', {}, 'must be equal to constant');
        valid = false;
        if (!allErrors) return false;
      }
    }

    // String keywords
    if (typeof data === 'string') {
      if (schema.minLength !== undefined && data.length < schema.minLength) {
        pushError(errors, instancePath, '#/minLength', 'minLength', { limit: schema.minLength }, 'must NOT have fewer than ' + schema.minLength + ' characters');
        valid = false; if (!allErrors) return false;
      }
      if (schema.maxLength !== undefined && data.length > schema.maxLength) {
        pushError(errors, instancePath, '#/maxLength', 'maxLength', { limit: schema.maxLength }, 'must NOT have more than ' + schema.maxLength + ' characters');
        valid = false; if (!allErrors) return false;
      }
      if (schema.pattern !== undefined) {
        try {
          if (!new RegExp(schema.pattern).test(data)) {
            pushError(errors, instancePath, '#/pattern', 'pattern', { pattern: schema.pattern }, 'must match pattern "' + schema.pattern + '"');
            valid = false; if (!allErrors) return false;
          }
        } catch (e) {}
      }
      if (schema.format !== undefined) {
        // basic format checks
        var fmtOk = checkFormat(schema.format, data);
        if (!fmtOk) {
          pushError(errors, instancePath, '#/format', 'format', { format: schema.format }, 'must match format "' + schema.format + '"');
          valid = false; if (!allErrors) return false;
        }
      }
    }

    // Number keywords
    if (typeof data === 'number') {
      if (schema.minimum !== undefined && data < schema.minimum) {
        pushError(errors, instancePath, '#/minimum', 'minimum', { comparison: '>=', limit: schema.minimum }, 'must be >= ' + schema.minimum);
        valid = false; if (!allErrors) return false;
      }
      if (schema.maximum !== undefined && data > schema.maximum) {
        pushError(errors, instancePath, '#/maximum', 'maximum', { comparison: '<=', limit: schema.maximum }, 'must be <= ' + schema.maximum);
        valid = false; if (!allErrors) return false;
      }
      if (schema.exclusiveMinimum !== undefined && data <= schema.exclusiveMinimum) {
        pushError(errors, instancePath, '#/exclusiveMinimum', 'exclusiveMinimum', { comparison: '>', limit: schema.exclusiveMinimum }, 'must be > ' + schema.exclusiveMinimum);
        valid = false; if (!allErrors) return false;
      }
      if (schema.exclusiveMaximum !== undefined && data >= schema.exclusiveMaximum) {
        pushError(errors, instancePath, '#/exclusiveMaximum', 'exclusiveMaximum', { comparison: '<', limit: schema.exclusiveMaximum }, 'must be < ' + schema.exclusiveMaximum);
        valid = false; if (!allErrors) return false;
      }
      if (schema.multipleOf !== undefined && schema.multipleOf !== 0) {
        var div = data / schema.multipleOf;
        if (Math.abs(div - Math.round(div)) > 1e-10) {
          pushError(errors, instancePath, '#/multipleOf', 'multipleOf', { multipleOf: schema.multipleOf }, 'must be multiple of ' + schema.multipleOf);
          valid = false; if (!allErrors) return false;
        }
      }
      if (schema.integer === true || (schema.type === 'integer')) {
        if (!Number.isInteger(data)) {
          pushError(errors, instancePath, '#/type', 'type', { type: 'integer' }, 'must be integer');
          valid = false; if (!allErrors) return false;
        }
      }
    }

    // Array keywords
    if (Array.isArray(data)) {
      if (schema.minItems !== undefined && data.length < schema.minItems) {
        pushError(errors, instancePath, '#/minItems', 'minItems', { limit: schema.minItems }, 'must NOT have fewer than ' + schema.minItems + ' items');
        valid = false; if (!allErrors) return false;
      }
      if (schema.maxItems !== undefined && data.length > schema.maxItems) {
        pushError(errors, instancePath, '#/maxItems', 'maxItems', { limit: schema.maxItems }, 'must NOT have more than ' + schema.maxItems + ' items');
        valid = false; if (!allErrors) return false;
      }
      if (schema.uniqueItems) {
        for (var i = 0; i < data.length; i++) {
          for (var j = i + 1; j < data.length; j++) {
            if (deepEqual(data[i], data[j])) {
              pushError(errors, instancePath, '#/uniqueItems', 'uniqueItems', { i: i, j: j }, 'must NOT have duplicate items');
              valid = false; if (!allErrors) return false;
            }
          }
        }
      }
      if (schema.items !== undefined) {
        if (Array.isArray(schema.items)) {
          for (var i = 0; i < schema.items.length; i++) {
            if (i < data.length) {
              var ok = validateSchema(schema.items[i], data[i], instancePath + '/' + i, rootSchema, errors, allErrors);
              if (!ok) { valid = false; if (!allErrors) return false; }
            }
          }
          if (schema.additionalItems === false) {
            for (var i = schema.items.length; i < data.length; i++) {
              pushError(errors, instancePath + '/' + i, '#/additionalItems', 'additionalItems', {}, 'must NOT have additional items');
              valid = false; if (!allErrors) return false;
            }
          } else if (schema.additionalItems && typeof schema.additionalItems === 'object') {
            for (var i = schema.items.length; i < data.length; i++) {
              var ok = validateSchema(schema.additionalItems, data[i], instancePath + '/' + i, rootSchema, errors, allErrors);
              if (!ok) { valid = false; if (!allErrors) return false; }
            }
          }
        } else {
          for (var i = 0; i < data.length; i++) {
            var ok = validateSchema(schema.items, data[i], instancePath + '/' + i, rootSchema, errors, allErrors);
            if (!ok) { valid = false; if (!allErrors) return false; }
          }
        }
      }
      if (schema.contains !== undefined) {
        var found = data.some(function (item, idx) {
          var e = [];
          return validateSchema(schema.contains, item, instancePath + '/' + idx, rootSchema, e, false);
        });
        if (!found) {
          pushError(errors, instancePath, '#/contains', 'contains', {}, 'must contain at least 1 valid item(s)');
          valid = false; if (!allErrors) return false;
        }
      }
    }

    // Object keywords
    if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
      var keys = Object.keys(data);

      if (schema.minProperties !== undefined && keys.length < schema.minProperties) {
        pushError(errors, instancePath, '#/minProperties', 'minProperties', { limit: schema.minProperties }, 'must NOT have fewer than ' + schema.minProperties + ' properties');
        valid = false; if (!allErrors) return false;
      }
      if (schema.maxProperties !== undefined && keys.length > schema.maxProperties) {
        pushError(errors, instancePath, '#/maxProperties', 'maxProperties', { limit: schema.maxProperties }, 'must NOT have more than ' + schema.maxProperties + ' properties');
        valid = false; if (!allErrors) return false;
      }

      if (schema.required !== undefined) {
        for (var i = 0; i < schema.required.length; i++) {
          if (!(schema.required[i] in data)) {
            pushError(errors, instancePath, '#/required', 'required', { missingProperty: schema.required[i] }, "must have required property '" + schema.required[i] + "'");
            valid = false; if (!allErrors) return false;
          }
        }
      }

      if (schema.properties !== undefined || schema.additionalProperties !== undefined || schema.patternProperties !== undefined) {
        var knownKeys = schema.properties ? Object.keys(schema.properties) : [];
        var patternKeys = schema.patternProperties ? Object.keys(schema.patternProperties) : [];

        for (var ki = 0; ki < keys.length; ki++) {
          var key = keys[ki];
          var childPath = instancePath + '/' + key.replace(/~/g, '~0').replace(/\//g, '~1');
          var matched = false;

          if (schema.properties && key in schema.properties) {
            matched = true;
            var ok = validateSchema(schema.properties[key], data[key], childPath, rootSchema, errors, allErrors);
            if (!ok) { valid = false; if (!allErrors) return false; }
          }

          for (var pi = 0; pi < patternKeys.length; pi++) {
            try {
              if (new RegExp(patternKeys[pi]).test(key)) {
                matched = true;
                var ok = validateSchema(schema.patternProperties[patternKeys[pi]], data[key], childPath, rootSchema, errors, allErrors);
                if (!ok) { valid = false; if (!allErrors) return false; }
              }
            } catch(e) {}
          }

          if (!matched && schema.additionalProperties !== undefined) {
            if (schema.additionalProperties === false) {
              pushError(errors, childPath, '#/additionalProperties', 'additionalProperties', { additionalProperty: key }, 'must NOT have additional properties');
              valid = false; if (!allErrors) return false;
            } else if (typeof schema.additionalProperties === 'object') {
              var ok = validateSchema(schema.additionalProperties, data[key], childPath, rootSchema, errors, allErrors);
              if (!ok) { valid = false; if (!allErrors) return false; }
            }
          }
        }
      }

      if (schema.dependencies !== undefined) {
        for (var dep in schema.dependencies) {
          if (dep in data) {
            var depSchema = schema.dependencies[dep];
            if (Array.isArray(depSchema)) {
              for (var di = 0; di < depSchema.length; di++) {
                if (!(depSchema[di] in data)) {
                  pushError(errors, instancePath, '#/dependencies', 'dependencies', { property: dep, missingProperty: depSchema[di] }, "must have property '" + depSchema[di] + "' when '" + dep + "' is present");
                  valid = false; if (!allErrors) return false;
                }
              }
            } else {
              var ok = validateSchema(depSchema, data, instancePath, rootSchema, errors, allErrors);
              if (!ok) { valid = false; if (!allErrors) return false; }
            }
          }
        }
      }

      if (schema.propertyNames !== undefined) {
        for (var ki = 0; ki < keys.length; ki++) {
          var ok = validateSchema(schema.propertyNames, keys[ki], instancePath, rootSchema, errors, allErrors);
          if (!ok) { valid = false; if (!allErrors) return false; }
        }
      }
    }

    // Combining keywords
    if (schema.allOf !== undefined) {
      for (var i = 0; i < schema.allOf.length; i++) {
        var ok = validateSchema(schema.allOf[i], data, instancePath, rootSchema, errors, allErrors);
        if (!ok) { valid = false; if (!allErrors) return false; }
      }
    }

    if (schema.anyOf !== undefined) {
      var anyValid = schema.anyOf.some(function (s) {
        var e = [];
        return validateSchema(s, data, instancePath, rootSchema, e, false);
      });
      if (!anyValid) {
        pushError(errors, instancePath, '#/anyOf', 'anyOf', {}, 'must match a schema in anyOf');
        valid = false; if (!allErrors) return false;
      }
    }

    if (schema.oneOf !== undefined) {
      var count = schema.oneOf.filter(function (s) {
        var e = [];
        return validateSchema(s, data, instancePath, rootSchema, e, false);
      }).length;
      if (count !== 1) {
        pushError(errors, instancePath, '#/oneOf', 'oneOf', { passingSchemas: count }, 'must match exactly one schema in oneOf');
        valid = false; if (!allErrors) return false;
      }
    }

    if (schema.not !== undefined) {
      var e = [];
      var notValid = validateSchema(schema.not, data, instancePath, rootSchema, e, false);
      if (notValid) {
        pushError(errors, instancePath, '#/not', 'not', {}, 'must NOT be valid');
        valid = false; if (!allErrors) return false;
      }
    }

    if (schema.if !== undefined) {
      var e = [];
      var ifValid = validateSchema(schema.if, data, instancePath, rootSchema, e, false);
      var branch = ifValid ? schema.then : schema.else;
      if (branch !== undefined) {
        var ok = validateSchema(branch, data, instancePath, rootSchema, errors, allErrors);
        if (!ok) { valid = false; if (!allErrors) return false; }
      }
    }

    return valid;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function checkType(type, data) {
    switch (type) {
      case 'null':    return data === null;
      case 'boolean': return typeof data === 'boolean';
      case 'integer': return typeof data === 'number' && Number.isInteger(data);
      case 'number':  return typeof data === 'number';
      case 'string':  return typeof data === 'string';
      case 'array':   return Array.isArray(data);
      case 'object':  return data !== null && typeof data === 'object' && !Array.isArray(data);
      default: return true;
    }
  }

  function checkFormat(format, value) {
    try {
      switch (format) {
        case 'date-time': return !isNaN(Date.parse(value));
        case 'date': return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
        case 'time': return /^\d{2}:\d{2}:\d{2}/.test(value);
        case 'email': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        case 'uri': return /^[a-z][a-z0-9+\-.]*:/i.test(value);
        case 'uuid': return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
        case 'ipv4': return /^(\d{1,3}\.){3}\d{1,3}$/.test(value);
        case 'ipv6': return value.includes(':');
        case 'hostname': return /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/.test(value);
        default: return true;
      }
    } catch(e) { return true; }
  }

  function resolveRef(ref, rootSchema) {
    if (ref === '#') return rootSchema;
    if (!ref.startsWith('#/')) return null;
    var parts = ref.slice(2).split('/').map(function (p) {
      return p.replace(/~1/g, '/').replace(/~0/g, '~');
    });
    var cur = rootSchema;
    for (var i = 0; i < parts.length; i++) {
      if (cur === null || typeof cur !== 'object') return null;
      cur = cur[parts[i]];
    }
    return cur !== undefined ? cur : null;
  }

  function pushError(errors, instancePath, schemaPath, keyword, params, message) {
    errors.push({ instancePath: instancePath, schemaPath: schemaPath, keyword: keyword, params: params, message: message });
  }

  function deepEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return a === b;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
      return true;
    }
    if (typeof a === 'object') {
      var ak = Object.keys(a), bk = Object.keys(b);
      if (ak.length !== bk.length) return false;
      for (var i = 0; i < ak.length; i++) if (!deepEqual(a[ak[i]], b[ak[i]])) return false;
      return true;
    }
    return false;
  }

  return Ajv;
})();

if (typeof window !== 'undefined') window.Ajv = Ajv;
