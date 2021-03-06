package Foswiki::Plugins::DnDUploadPlugin;

use strict;
use warnings;

use Digest::MD5;
use Digest::SHA;
use Foswiki::Func;
use Foswiki::Plugins;
use Foswiki::Plugins::JQueryPlugin;

use version;
our $VERSION = version->declare( '1.0.0' );
our $RELEASE = '1.0.0';
our $NO_PREFS_IN_TOPIC = 1;
our $SHORTDESCRIPTION = "Drag'n drop uploads";

sub initPlugin {
  my ( $topic, $web, $user, $installWeb ) = @_;

  if ( $Foswiki::Plugins::VERSION < 2.0 ) {
      Foswiki::Func::writeWarning( 'Version mismatch between ',
          __PACKAGE__, ' and Plugins.pm' );
      return 0;
  }

  Foswiki::Func::registerTagHandler( 'DNDUPLOAD', \&tagUpload );
  Foswiki::Func::registerRESTHandler( 'validation', \&restValidation,
    authenticate => 1,
    http_allow => 'GET',
    validate => 0
  );

  return 1;
}

sub tagUpload {
  my( $session, $params, $topic, $web, $topicObject ) = @_;

  my $width = $params->{width} || '';
  my $height = $params ->{height} || '';
  my $class = $params->{extraclass} || '';
  my $autostart = $params->{autostart};
  my $blockui = $params->{blockui} || 0;
  my $webtopic = $params->{webtopic} || '';
  my $headonly = $params->{headonly} || 0;

  if ( !$webtopic ) {
    $web = $params->{web} || $web;
    $topic = $params->{topic} || $topic;
    ($web, $topic) = Foswiki::Func::normalizeWebTopicName( $web, $topic );
  } else {
    ($web, $topic) = Foswiki::Func::normalizeWebTopicName( undef, $webtopic );
  }

  $autostart = 'on' unless defined $autostart;
  if ( $autostart && $autostart =~ m/^(on|1|enabled|true)$/i ) {
    $autostart = 'auto';
  } else {
    $autostart = '';
  }

  my @styles = ();
  if ($width) {
    my $str = "width: $width";
    $str .= 'px' if $width =~ /^\d+$/;
    push(@styles, $str);
  }

  if ($height) {
    my $str = "height: $height";
    $str .= 'px' if $height =~ /^\d+$/;
    push(@styles, $str);
  }

  my $style = '';
  if (scalar @styles) {
    $style = 'style="' . join(';', @styles) . '"';
  }

  if ($blockui) {
    Foswiki::Plugins::JQueryPlugin::createPlugin('blockui');
  }

  my $debug = $Foswiki::cfg{Plugins}{DnDUploadPlugin}{Debug} || 0;
  my $suffix = $debug ? '' : '.min';
  my $pluginURL = '%PUBURLPATH%/%SYSTEMWEB%/DnDUploadPlugin';
  Foswiki::Func::addToZone( 'script', 'DNDUPLOADPLUGIN::SCRIPTS', <<SCRIPT, 'JQUERYPLUGIN::FOSWIKI::PREFERENCES' );
<script type="text/javascript" src="$pluginURL/js/dndupload$suffix.js"></script>
SCRIPT

  Foswiki::Func::addToZone( 'head', 'DNDUPLOADPLUGIN::STYLES', <<STYLE );
<link rel='stylesheet' type='text/css' media='all' href='$pluginURL/css/dndupload$suffix.css' />
STYLE

  return '' if $headonly;

  my $id = Digest::SHA::sha1_hex(time . rand(99999));
  my $div = <<DIV;
<div class="qw-dnd-upload $class $autostart" $style data-id="$id" data-web="$web" data-topic="$topic" data-blockui="$blockui">
  <div class="hint">
    <img src="$pluginURL/assets/upload.png" border="0" width="32" height="32" />
    <span>%MAKETEXT{"Click or drag'n drop"}%</span>
    <input class="qw-file-input" type="file" style="visibility: hidden" multiple="multiple" />
  </div>
  <div class="container"></div>
</div>
DIV

  return $div;
}

sub restValidation {
  my ( $session, $subject, $verb, $response ) = @_;

  my $q = $session->{request};
  my ($web, $topic) = Foswiki::Func::normalizeWebTopicName(undef, $q->param('topic'));
  my $cgis = $session->getCGISession();
  my $context = "$web.$topic";

  my $actions = $cgis->param('VALID_ACTIONS') || {};
  my $key = Digest::MD5::md5_hex( $context, $cgis->id() );
  my $action = $key;
  my $timeout = time() + $Foswiki::cfg{Validation}{ValidForTime};
  $actions->{$action} = $timeout;
  $cgis->param( 'VALID_ACTIONS', $actions );

  return $key;
}

1;

__END__
Foswiki - The Free and Open Source Wiki, http://foswiki.org/

Author: Sven Meyer <meyer@modell-aachen.de>

Copyright (C) 2008-2015 Foswiki Contributors. Foswiki Contributors
are listed in the AUTHORS file in the root of this distribution.
NOTE: Please extend that file, not this notice.

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version. For
more details read LICENSE in the root of this distribution.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

As per the GPL, removal of this notice is prohibited.
