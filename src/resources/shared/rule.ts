import type { InputRule } from '../../internal/core/types';

export const nameRule: InputRule = {
  min: 1,
  name: 'name',
  of: 'characters',
};

export const domainsRule: InputRule = {
  min: 1,
  name: 'domains',
  of: 'items',
};

export const brandNameRule: InputRule = {
  min: 1,
  name: 'brandName',
  of: 'characters',
};

export const valueRule: InputRule = {
  min: 1,
  name: 'value',
  of: 'characters',
};
