/* eslint camelcase: off */

/* global $, cordova */

var DEBUG = false
var AUTHENTICATION = false

console.log('DEBUG: ', DEBUG)
console.log('AUTHENTICATION: ', AUTHENTICATION)

var app = {}

app.main = (function (thisModule) {
  var wasInit

  thisModule.emailTo = ''
  thisModule.imagesUriArray = []
  thisModule.imagesUriCleanArray = []
  thisModule.variables = {} // global object used for debug

  $(document).ready(function () {
    console.log('$(document).ready started')
    wasInit = false
    document.addEventListener('deviceready', onDeviceReady, false)

    $('#sidebarCollapse').on('click', function () {
      $('#sidebar').toggleClass('active')
      updateSidebarAndContentViews()
    })

    // hides Personal Data information section
    app.form.showSection('main_form')
  })

  function onDeviceReady () {
    console.log('onDeviceReady() started')

    document.addEventListener('online', onOnline, false)
    document.addEventListener('resume', onResume, false)

    window.screen.orientation.lock('portrait')

    init()
  }

  // if by any strange reason onDeviceReady doesn't trigger, load init() anyway
  setTimeout(function () {
    if (!wasInit) {
      init()
    }
  }, 3000)

  // when the page loads
  function init () {
    console.log('init() started')
    wasInit = true

    // information stored in variable window.localStorage
    app.form.loadsPersonalInfo()

    // populates HTML select according to the information on penalties.js file
    app.penalties.populatesPenalties()

    app.functions.updateDateAndTime()

    $('input').each(function () {
      if (!DEBUG && $(this).val() === '') {
        $(this).css('border-color', 'red')
      }
    })

    $('#plate').css('border-color', '')
    app.form.setPortuguesePlateInput()

    app.localization.loadMapsApi()
  }

  // ##############################################################################################################
  // ##############################################################################################################

  function onOnline () {
    app.localization.loadMapsApi()
  }

  function onResume () {
    app.localization.loadMapsApi()
  }

  // buttons "Add Image"
  $('#addImg_1, #addImg_2, #addImg_3, #addImg_4').click(function () {
    // get id, for example #remImg_2
    var id = $(this).attr('id')
    console.log('photo id: ' + id)
    // gets the number of the element, by obtaining the last character of the id
    var num = id[id.length - 1]

    var callback = function (imgNmbr) {
      // hides "Adds image" button
      $('#' + 'addImg_' + imgNmbr).html('<i class="fas fa-edit"></i>')
      $('#' + 'remImg_' + imgNmbr).show()
      updateImgContainers()
    }

    $.jAlert({
      'title': 'Método de obtenção da foto:',
      'theme': 'dark_blue',
      'btns': [
        {
          'text': 'Câmara',
          'theme': 'green',
          'class': 'jButtonAlert',
          'onClick': function () { app.photos.getPhoto(num, 'camera', callback) }
        },
        {
          'text': 'Biblioteca de fotos',
          'theme': 'green',
          'class': 'jButtonAlert',
          'onClick': function () { app.photos.getPhoto(num, 'library', callback) }
        }
      ]
    })
  })

  // buttons "Remove Image"
  $('#remImg_1, #remImg_2, #remImg_3, #remImg_4').click(function () {
    // get id, for example #remImg_2
    var id = $(this).attr('id')
    // gets the number of the element, by obtaining the last character of the id
    var num = id[id.length - 1]

    app.photos.removeImage('myImg_' + num, num)
    $(this).hide()

    $('#addImg_' + num).html('<i class="fas fa-plus"></i>')

    updateImgContainers()
  })

  function updateImgContainers () {
    var numberOfContainers = $('#image_selector .img-container').length
    var hasShownButton = false
    for (var i = 0; i < numberOfContainers; i++) {
      console.log(i)
      var $this = $('#image_selector .img-container').eq(i)
      if (!$this.find('img').attr('src')) {
        if (!hasShownButton) {
          console.log('show')
          $this.show()
          hasShownButton = true
        } else {
          $this.hide()
        }
      }
    }
  }

  function updateSidebarAndContentViews () {
    if ($('#sidebar').hasClass('active')) {
      $('#content').fadeTo(200, 0.3).prop('disabled', true)
    } else {
      $('#content').fadeTo(200, 1).prop('disabled', false)
    }
  }

  // when user clicks "generate_email"
  $('#generate_message').click(function () {
    if (!app.text.isMessageReady()) {
      return
    }

    var mainMessage = app.text.getMainMessage() + '<br><br>' + app.text.getRegards() + '<br>'
    $('#message').html(mainMessage)
    $('#mail_message').show()

    // scrolls to the generated message
    $('html, body').animate({
      scrollTop: $('#message').offset().top
    }, 1000)
  })

  // botão de gerar email
  $('#send_email_btn').click(function () {
    // it popups the alerts according to needed fields
    if (!app.text.isMessageReady()) {
      return
    }

    if (AUTHENTICATION) {
      var mensagem = 'A Autoridade Nacional de Segurança Rodoviária (ANSR), num parecer enviado às polícias a propósito desta APP, refere que as polícias devem de facto proceder à emissão efetiva da multa, perante as queixas dos cidadãos por esta via. Todavia, refere a ANSR, que os denunciantes deverão posteriormente dirigir-se às instalações da polícia respetiva, para se identificarem presencialmente.<br><br>Caso não se queira dirigir à polícia, terá de se autenticar fazendo uso da <b>Chave  Móvel Digital</b> emitida pela Administração Pública. Caso não tenha uma, veja <a href="https://www.autenticacao.gov.pt/cmd-pedido-chave">aqui</a> como pedi-la.'

      $.jAlert({
        'title': 'Deseja autenticar a sua mensagem com Chave Móvel Digital?',
        'content': mensagem,
        'theme': 'dark_blue',
        'btns': [
          {
            'text': 'Sim',
            'theme': 'green',
            'class': 'jButtonAlert',
            'onClick': app.authentication.startAuthentication
          },
          {
            'text': 'Não',
            'theme': 'green',
            'class': 'jButtonAlert',
            'onClick': sendMailMessage
          }
        ]
      })
    } else {
      sendMailMessage()
    }
  })

  function sendMailMessage () {
    var mainMessage = app.text.getMainMessage() + '<br><br>' + app.text.getRegards() + '<br>'
    var emailSubject = 'Denúncia de estacionamento ao abrigo do n.º 5 do art. 170.º do Código da Estrada'

    cordova.plugins.email.open({
      to: thisModule.emailTo, // email addresses for TO field
      attachments: thisModule.imagesUriCleanArray, // file paths or base64 data streams
      subject: emailSubject, // subject of the email
      body: mainMessage, // email body (for HTML, set isHtml to true)
      isHtml: true // indicats if the body is HTML or plain text
    })
  }

  thisModule.sendMailMessage = sendMailMessage
  thisModule.updateSidebarAndContentViews = updateSidebarAndContentViews

  return thisModule
})({})
