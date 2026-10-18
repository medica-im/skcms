# The body of every server in dev-site-test.conf: hand the request to the
# site's own vhost on :443, marked as test-all's, so that vhost — API, media,
# WordPress and all — stays the one definition of the site, and only its app
# proxy changes port (see $dev_site_port in dev-site-ports.conf).

client_max_body_size 100M;

# How test-all tells this route from the vhosts' own, which answer on the same
# address when this file is not installed.
add_header X-Dev-Site-Test 1 always;

location / {
	proxy_pass https://127.0.0.1:443;
	proxy_ssl_server_name on;
	proxy_ssl_name $host;
	proxy_set_header Host $host;
	proxy_set_header X-Dev-Site-Test 1;
	proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

	# Vite's HMR socket and the app's live streams pass through too.
	proxy_http_version 1.1;
	proxy_set_header Upgrade $http_upgrade;
	proxy_set_header Connection "upgrade";
	# A second proxy hides X-Accel-Buffering from the next hop, and buffers an
	# event stream unless told not to.
	proxy_pass_header X-Accel-Buffering;
	proxy_buffering off;

	proxy_read_timeout 300;
	proxy_send_timeout 300;
	proxy_redirect off;
}
