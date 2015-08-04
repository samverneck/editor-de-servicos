'use strict';

var modelos = require('modelos');
var importarXml = require('xml/importar-v3');
var exportarXml = require('xml/exportar');
var salvarXml = require('xml/salvar');
var slugify = require('slugify');
var carregarServico = require('carregar-servico');

module.exports = {
  controller: function () {
    this.cabecalho = new modelos.Cabecalho();
    this.servico = carregarServico(m.route.param('id'), this.cabecalho);

    this.salvar = function () {
      return salvarXml(slugify(this.servico().nome()), exportarXml(this.servico()), this.cabecalho.metadados)
        .then(function (xml) {
          modelos.id.reset();
          return importarXml(xml);
        })
        //        .then(this.servico)
        .then(_.bind(this.cabecalho.limparErro, this.cabecalho), _.bind(function () {
          this.cabecalho.tentarNovamente(_.bind(this.salvar, this));
        }, this));
    };
  },

  view: function (ctrl) {
    var binding = {
      servico: ctrl.servico
    };

    var salvarAutomaticamente = _.debounce(_.bind(ctrl.salvar, ctrl), 2000, {
      leading: false
    });

    return m('#conteudo', [
      m('span.cabecalho-cor'),
      m('#wrapper', [
        m.component(require('componentes/cabecalho'), {
          cabecalho: ctrl.cabecalho
        }),
        m.component(require('componentes/menu-lateral'), binding),

        m('#principal', {
          onchange: salvarAutomaticamente,
          onclick: _.wrap(salvarAutomaticamente, function (fn, e) {
            var target = jQuery(e.target);
            if (target.is('button') || target.parents('button').size() > 0) {
              return salvarAutomaticamente(e);
            }
          })
        }, m('.scroll', [
          m.component(require('componentes/dados-basicos'), binding),
          m.component(require('componentes/solicitantes'), binding),
          m.component(require('componentes/etapas'), binding),
          m.component(require('componentes/outras-informacoes'), binding),
        ]))
      ])
    ]);
  }
};
