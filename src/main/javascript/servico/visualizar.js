'use strict';

var CabecalhoModel = require('cabecalho/cabecalho-model');
var carregarServico = require('xml/carregar');
var limparModelo = require('limpar-modelo');
var slugify = require('slugify');
var service = require('servico/service');


module.exports = {

  controller: function (args) {
    this.cabecalho = new CabecalhoModel();
    this.servico = _.isNull(service.servico()) ? carregarServico(m.route.param('id'), this.cabecalho) : service.servico();

    this.editar = function () {
      var id = slugify(this.servico().nome());
      m.route('/editar/servico/' + id);
      return true;
    };
  },

  view: function (ctrl, args) {
    var servico = limparModelo(ctrl.servico());
    return m('#conteudo', [
                m('span.cabecalho-cor'),
                m('#wrapper', [
                m.component(require('cabecalho/cabecalho'), {
          metadados: true,
          logout: true,
          editar: _.bind(ctrl.editar, ctrl),
          cabecalho: ctrl.cabecalho
        }),
                    m('#visualizar', m('#main', m('section#conteudo', [m('.row', m('h2', servico.nome() + (servico.sigla() ? ' (' + servico.sigla() + ')' : ''))),
                        m('.row', m.component(require('servico/visualizar/ancoras'), servico)),
                        m('.row', m.component(require('servico/visualizar/descricao'), servico)),
                        m('.row', m.component(require('servico/visualizar/solicitantes'), servico)),
                        m('.row', m.component(require('servico/visualizar/etapas'), servico)),
                        m('.row', m.component(require('servico/visualizar/tempo'), servico)),
                        m('.row', m.component(require('servico/visualizar/legislacao'), servico)),
                        m('.row', m.component(require('servico/visualizar/outras-info'), servico))
                    ])))
                ])
        ]);
  }
};
