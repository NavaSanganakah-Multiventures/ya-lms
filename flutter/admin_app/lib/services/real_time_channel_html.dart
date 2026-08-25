import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/html.dart';

WebSocketChannel connect(Uri uri, {Map<String, dynamic>? headers}) {
  return HtmlWebSocketChannel.connect(uri);
}
