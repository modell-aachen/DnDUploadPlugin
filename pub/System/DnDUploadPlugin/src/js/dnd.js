;(function ($, _, document, window, undefined) {
  'use strict';

  $(document).ready( function() {
    $('body').on('click', '.qw-dnd-upload', handleDnDUpload);
    $('body').on('dragover', '.qw-dnd-upload', onDrag);
    $('body').on('dragleave', '.qw-dnd-upload', onDrag);
    $('body').on('drop', '.qw-dnd-upload', onDrop);
  });

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
    if ( $(evt.target).hasClass('qw-file-input') ) {
      return;
    }

    var $input = $this.find('input');
    $input.off( 'change', onInputChanged );
    $input.on( 'change', onInputChanged );

    if ( /^(1|on|true|enabled?)$/i.test( $this.attr('data-tasksgrid') ) ) {
      var $editor = $('#task-editor');
      var trackerId = $editor.data('trackerId');
      var $tracker = $('#' + trackerId);
      $tracker.on( 'beforeEdit', function( evt, task ) {
        var taskId = task.id;
        var arr = taskId.split('.');
        $this.attr('data-web', arr[0]);
        $this.attr('data-topic', arr[1]);
      });

      $tracker.on( 'beforeCreate', function() {
        $editor.find('.twistyPlugin').css('display', 'none');
      });

      $tracker.on( 'afterSave', function() {
        $editor.find('.twistyPlugin').css('display', 'block');
      });

      $tracker.on( 'editCanceled', function() {
        $editor.find('.twistyPlugin').css('display', 'block');
      });
    }

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

    var container = '<div class="upload"><span class="title"></span><div class="progress"></div></div>';
    var $container = $(container);
    $container.children().each( function() {
      $(this).text( file.name );
    });

    var data = {
      file: file,
      container: $container
    };

    files[id].push( data );
    $container.appendTo( $('.qw-dnd-upload[data-id="' + id + '"] > .container') );

    if ( isAutoUpload( id ) ) {
      uploadNext( id );
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
    var payload = new FormData();
    payload.append("filepath", data.file);
    payload.append("filename", data.file.name);
    payload.append("filecomment", '');

    var client = new XMLHttpRequest();
    client.withCredentials = true;
    client.onerror = error;
    client.onabort = log;

    var $container = $(data.container);
    client.upload.onprogress = function( evt ) {
      var val = Math.round( 100/evt.total * evt.loaded );
      var percent = val + '%';

      $container.find('div.progress').css('width', percent);

      // continue with next file
      if ( val === 100 ) {
        lock = setInterval(function() {
          if (client.readyState === 4) {
            clearInterval(lock);
            locked = false;

            if ( isAutoUpload( id ) ) {
              uploadNext( id );
            }
          }
        }, 100);
      }
    };

    var wt = getWebTopic( id );
    var p = foswiki.preferences;
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
      client.send( payload );
    });
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
  };
}(jQuery, window._, window.document, window));
