'use strict';

var slugify = require('slugify');
var idUnico = require('utils/id-unico');
var api = require('api');

module.exports = {

  controller: function (args) {
    this.servico = args.servico;
    this.renomeando = m.prop(false);

    this.validar = function (nome) {
      var idAtual = slugify(this.servico().nome());
      if (!nome) {
        return 'Este campo é obrigatório.';
      }
      if (idAtual !== slugify(nome) && !idUnico(nome)) {
        return 'O nome preenchido já está sendo utilizado em outro serviço.';
      }
    };

    this.renomearServico = function (novoNome) {
      this.renomeando(true);
      m.redraw();
      var servico = this.servico();
      var idAtual = slugify(servico.nome());
      api.renomear(idAtual, novoNome).then(_.bind(function () {
        servico.nome(novoNome);
        m.route('/editar/servico/' + slugify(novoNome));
        alertify.success('Serviço renomeado com sucesso!', 0);
        this.renomeando(false);
      }, this));
    };
  },

  view: function (ctrl, args) {
    ctrl.servico = args.servico;

    var novo = args.novo;
    var servico = ctrl.servico();

    var componenteNome = novo ? m('div.input-container', {
      class: servico.nome.erro()
    }, m('input[type=text]', {
      onchange: m.withAttr('value', servico.nome),
      value: servico.nome(),
      autofocus: 'autofocus'
    })) : m('div', [
            m('span', servico.nome()),
            m('button.renomear', {
        disabled: ctrl.renomeando(),
        style: {
          float: 'right'
        },
        onclick: function () {
          var renomear = function () {
            alertify.labels.cancel = 'Cancelar';
            alertify.labels.ok = 'Renomear';
            alertify.prompt('Novo nome do serviço:',
              function (e, novoNome) {
                if (e && servico.nome() !== novoNome) {
                  var validacao = ctrl.validar(novoNome);
                  if (!validacao) {
                    ctrl.renomearServico(novoNome);
                  } else {
                    alertify.labels.ok = 'Ok';
                    alertify.alert(validacao, function () {
                      renomear();
                    });
                  }

                }
              },
              servico.nome()
            );
          };
          renomear();
        }
      }, ctrl.renomeando() ? [m('i.fa.fa-spin.fa-spinner'), ' Alterando nome...'] : [m('i.fa.fa-pencil'), ' Alterar nome'])
        ]);

    return m('fieldset#nome', [
      m('h2', 'dados básicos'),
      m('h3', [
        'Nome do serviço',
        m.component(require('tooltips').nome)
      ]),
      componenteNome
    ]);

  }

};
