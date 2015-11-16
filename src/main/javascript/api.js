'use strict';

var erro = require('utils/erro-ajax');
var extrairMetadados = require('utils/extrair-metadados');

function request(opts) {
  return m.request(_.merge({
      method: 'GET',
      deserialize: _.identity
    }, opts))
    .then(_.identity, erro);
}

module.exports = {
  publicar: function (id, metadados) {
    return request({
      method: 'PUT',
      url: '/editar/api/pagina/servico/' + id,
      extract: extrairMetadados(metadados)
    });
  },

  descartar: function (id, metadados) {
    var url = '/editar/api/pagina/servico/' + id + '/descartar';
    var mimeType = 'application/xml';

    return request({
      method: 'POST',
      url: url,
      config: function (xhr) {
        xhr.setRequestHeader('Accept', mimeType);
      },
      extract: extrairMetadados(metadados),
      deserialize: function (str) {
        return new DOMParser().parseFromString(str, 'application/xml');
      },
    });
  },

  despublicar: function (id, metadados) {
    var url = '/editar/api/pagina/servico/' + id + '/despublicar';
    return request({
      method: 'POST',
      url: url,
      extract: extrairMetadados(metadados)
    });
  },

  importarXml: function (urlParam) {
    return request({
      method: 'GET',
      url: '/editar/api/importar-xml',
      config: function (xhr) {
        xhr.setRequestHeader('Accept', 'application/xml');
      },
      data: {
        url: urlParam
      },
      deserialize: function (str) {
        return new DOMParser().parseFromString(str, 'application/xml');
      }
    });
  }
};