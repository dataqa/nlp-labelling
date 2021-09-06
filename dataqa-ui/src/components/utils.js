import _ from 'lodash';

const processValToCamelCase = (val) => {
  return (
    ((typeof val !== 'object') || (val === null)) ? val: 
        Array.isArray(val)? val.map(renameKeysToCamelCase): renameKeysToCamelCase(val))
};

export function renameKeysToCamelCase(obj){
  if((typeof obj !== 'object') || (obj === null)){
    return obj;
  }
  else{
    return (Object.fromEntries(
    Object.entries(obj)
      .map(([key, val]) => [
        _.camelCase(key), processValToCamelCase(val)
      ])
  ))}};


  const processValToSnakeCase = (val) => {
    return (
      ((typeof val !== 'object') || (val === null)) ? val: 
          Array.isArray(val)? val.map(renameKeysToSnakeCase): renameKeysToSnakeCase(val))
  };
  
  export function renameKeysToSnakeCase(obj){
    if((typeof obj !== 'object') || (obj === null)){
      return obj;
    }
    else{
      return (Object.fromEntries(
      Object.entries(obj)
        .map(([key, val]) => [
          _.snakeCase(key), processValToSnakeCase(val)
        ])
    ))}};