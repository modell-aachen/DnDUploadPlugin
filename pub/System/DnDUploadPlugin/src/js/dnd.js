;(function ($, _, document, window, undefined) {
  'use strict';

  $.fn.upload = function() {
    if ( !this.hasClass('qw-dnd-upload') ) {
      return this;
    }

    return this.each( function() {
      var $this = $(this);
      $this.addClass('auto');
      uploadNext( $this.data('id') || $this.attr('data-id') );
    });
  };

  $.fn.isEmpty = function() {
    if ( !this.hasClass('qw-dnd-upload') ) {
      return this;
    }

    var id = this.data('id') || this.attr('data-id');
    if (!files[id]) {
      return true;
    }

    return files[id].length === 0;
  };

  $.fn.clearQueue = function( suppressEvent ) {
    if ( !this.hasClass('qw-dnd-upload') ) {
      return this;
    }

    return this.each( function() {
      var $this = $(this);
      var id = $this.data('id') || $this.attr('data-id');
      files[id] = [];
      $this.find('.container').empty();

      // invoke to trigger the 'queueEmpty' event...
      if ( !suppressEvent && typeof suppressEvent !== typeof undefined ) {
        uploadNext(id);
      }
    });
  };

  var onDrag = function(evt) {
    evt.preventDefault();
    evt.stopPropagation();
  };

  var onDrop = function(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    var $this = $(this);
    var e = evt.originalEvent;
    $.each( e.dataTransfer.files, function( file ) {
      enqueueFile( this, $this.data('id') || $this.attr('data-id') );
    });
  };

  var handleDnDUpload = function(evt) {
    var $this = $(this);

    var isCancel = $(evt.target).hasClass('qw-dnd-cancel');
    var isInput = $(evt.target).hasClass('qw-file-input');

    if ( isCancel ) {
      var $container = $(evt.target).parent();
      var fname = $container.text() || '';
      var id = $this.data('id') || $this.attr('data-id');

      if ( !fname ) {
        return false;
      }

      for (var i = 0; i < files[id].length; ++i) {
        var file = files[id][i];
        if ( file.file.name === fname ) {
          files[id].splice(i, 1);
          $container.remove();
          return false;
        }
      }

      return false;
    } if ( isInput ) {
      return; // just exit here, do not stop propagation
    }

    var $input = $this.find('input');
    $input.off( 'change', onInputChanged );
    $input.on( 'change', onInputChanged );

    setTimeout(function() {
      $input.trigger('click');
    }, 10);

    evt.preventDefault();
    return false;
  };

  var onInputChanged = function( evt ) {
    var $this = $(this);
    var $dnd = $this.closest('.qw-dnd-upload');
    var id = $dnd.data('id') || $dnd.attr('data-id');

    $.each( this.files, function() {
      enqueueFile( this, id );
    });
  };

  var files = {};
  var enqueueFile = function( file, id ) {
    if ( !files[id] ) {
      files[id] = [];
    }

    //since DnDUpload is full coupled to the taskapi, i.e. REST URL, we could also rely on
    //settings given by the ckeditor used as alternative fileupload
    //To be safe, fallback to the default foswiki value.
    var maxFileSize = foswiki.preferences.ckeditor4.config.taskeditor.simpleuploads_maxFileSize || 10000000;
    if( maxFileSize < file.size ) {
      displayError("Filesize to large (maximum: " + maxFileSize/1000/1000 + "MB)");
      return;
    }

    var $container = $('<div class="upload"><span class="title"></span><div class="progress"></div></div>');
    $container.children('.title').text( file.name );

    var data = {
      file: file,
      container: $container
    };

    files[id].push( data );
    $container.appendTo( $('.qw-dnd-upload[data-id="' + id + '"] > .container') );

    if ( isAutoUpload( id ) ) {
      uploadNext( id );
    } else {
      $container.append($('<span class="qw-dnd-cancel"></span>'));
    }
  };

  var lock;
  var locked = false;
  var uiBlocked = false;
  var uploadNext = function( id ) {
    var $dnd = $('.qw-dnd-upload[data-id="' + id + '"]');
    if ( typeof files[id] === 'undefined' || files[id].length === 0 ) {
      var empty = $.Event( 'queueEmpty' );
      $dnd.trigger( empty, this );
      $dnd.find('.container').empty();
      locked = false;
      if ($dnd.data('blockui') && typeof $.unblockUI === 'function') {
        $.unblockUI();
        uiBlocked = false;
      }

      return;
    }

    if (locked) {
      return;
    }

    if ($dnd.data('blockui') && typeof $.blockUI === 'function' && !uiBlocked) {
      $.blockUI();
      uiBlocked = true;
    }

    locked = true;
    var data = files[id].shift();
    var $container = $(data.container);
    var p = foswiki.preferences;
    var payload = new FormData();

    payload.append("filepath", data.file);
    payload.append("filename", data.file.name);

    var client = new XMLHttpRequest();
    client.onerror = error;
    client.onabort = log;
    client.errorMessage = undefined;

    client.upload.onprogress = function( evt ) {
      var val = Math.round( 100/evt.total * evt.loaded );
      var percent = val + '%';
      $container.find('div.progress').css('width', percent);

      // continue with next file
      if ( val === 100 && !lock ) {
        lock = setInterval(function() {
          if (client.readyState === 4) {
            clearInterval(lock);
            lock = undefined;
            locked = false;
            client.abort();

            if (typeof client.errorMessage != 'undefined' ) {

              displayError( client.errorMessage.msg, function() {
                  client.errorMessage = undefined;
                  if ( isAutoUpload( id ) ) {
                    uploadNext( id );
                  }
              });

            }else{
              if ( isAutoUpload( id ) ) {
                uploadNext( id );
              }
            }
          }
        }, 100);
      }
    };

    var wt = getWebTopic( id );
    if ( /^1$/.test($dnd.data('tasksgrid')) ) {
      var attachurl = [
        p.SCRIPTURLPATH,
        '/rest',
        p.SCRIPTTSUFFIX,
        '/TasksAPIPlugin/attach'
      ].join('');

      client.onload = function () {
        if(  client.response && client.response.code=='filenamelength_error' ){
          client.errorMessage = client.response;
        }
        return client.response;
      }

      payload.append("id", wt.web + '.' + wt.topic);
      client.open( "POST", attachurl );
      client.responseType = 'json';
      client.withCredentials = true;
      client.send( payload );
    } else {
      var keyurl = [
        p.SCRIPTURLPATH,
        '/rest',
        p.SCRIPTTSUFFIX,
        '/DnDUploadPlugin/validation?topic=',
        wt.web,
        '.',
        wt.topic
      ].join('');

      var uploadurl = [
        p.SCRIPTURLPATH,
        '/upload',
        p.SCRIPTTSUFFIX,
        '/',
        wt.web,
        '.',
        wt.topic
      ].join('');

      $.get( keyurl, function( key ) {
        payload.append("validation_key", key);
        client.open( "POST", uploadurl );
        client.withCredentials = true;
        client.send( payload );
      });
    }
  };

  var isAutoUpload = function( id ) {
    if ( !id ) {
      return false;
    }

    var sel = '.qw-dnd-upload[data-id="' + id + '"]';
    return $(sel).hasClass('auto');
  };

  var getWebTopic = function( id ) {
    var sel = '.qw-dnd-upload[data-id="' + id + '"]';
    var $cnt = $(sel);
    var data = {
      web: $cnt.attr('data-web'),
      topic: $cnt.attr('data-topic')
    };

    return data;
  };

  var log = function( msg ) {
    if ( window.console && console.log ) {
      console.log( msg );
    }
  };

  var error = function( msg ) {
    if ( window.console && console.error ) {
      console.error( msg );
    }

    displayError( jsi18n.get('tasksapi', 'Something went wrong! Try again later.') );
  };

  var displayError = function( errorText, callback ){
    swal({
      type: 'error',
      title: jsi18n.get( 'tasksapi', 'Oops' ),
      text: errorText,
      showConfirmButton: true,
      showCancelButton: false
    }, callback );
  }

  var events = {
    'click.dnd': handleDnDUpload,
    'dragover.dnd': onDrag,
    'dragleave.dnd': onDrag,
    'drop.dnd': onDrop
  };

  $(document).off('.dnd').on(events, '.qw-dnd-upload');
}(jQuery, window._, window.document, window));
