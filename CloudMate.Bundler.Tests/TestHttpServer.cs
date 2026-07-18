using System.Net;
using System.Net.Sockets;
using System.Text;

namespace AngryMonkey.CloudMate.Tests;

/// <summary>A minimal loopback HTTP server for deterministic compiler import tests.</summary>
internal sealed class TestHttpServer : IDisposable
{
    private readonly IReadOnlyDictionary<string, string> _responses;
    private readonly TcpListener _listener;
    private readonly CancellationTokenSource _cancellation = new();
    private readonly Task _serverTask;

    public Uri BaseUri { get; }

    public TestHttpServer(IReadOnlyDictionary<string, string> responses)
    {
        _responses = responses;
        _listener = new TcpListener(IPAddress.Loopback, 0);
        _listener.Start();

        int port = ((IPEndPoint)_listener.LocalEndpoint).Port;
        BaseUri = new Uri($"http://127.0.0.1:{port}/");
        _serverTask = Task.Run(ServeAsync);
    }

    private async Task ServeAsync()
    {
        try
        {
            while (!_cancellation.IsCancellationRequested)
            {
                using TcpClient client = await _listener.AcceptTcpClientAsync(_cancellation.Token);
                await RespondAsync(client, _cancellation.Token);
            }
        }
        catch (OperationCanceledException)
        {
        }
        catch (ObjectDisposedException)
        {
        }
    }

    private async Task RespondAsync(TcpClient client, CancellationToken cancellationToken)
    {
        using NetworkStream stream = client.GetStream();
        using StreamReader reader = new(stream, Encoding.ASCII, leaveOpen: true);

        string? requestLine = await reader.ReadLineAsync(cancellationToken);
        string? line;
        do
        {
            line = await reader.ReadLineAsync(cancellationToken);
        }
        while (!string.IsNullOrEmpty(line));

        string target = requestLine?.Split(' ', StringSplitOptions.RemoveEmptyEntries).ElementAtOrDefault(1) ?? "/";
        string path = new Uri(BaseUri, target).AbsolutePath;
        bool found = _responses.TryGetValue(path, out string? content);
        byte[] body = Encoding.UTF8.GetBytes(content ?? "Not found");
        string headers = $"HTTP/1.1 {(found ? "200 OK" : "404 Not Found")}\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: {body.Length}\r\nConnection: close\r\n\r\n";

        await stream.WriteAsync(Encoding.ASCII.GetBytes(headers), cancellationToken);
        await stream.WriteAsync(body, cancellationToken);
    }

    public void Dispose()
    {
        _cancellation.Cancel();
        _listener.Stop();

        try
        {
            _serverTask.Wait(TimeSpan.FromSeconds(2));
        }
        catch (AggregateException)
        {
        }

        _cancellation.Dispose();
    }
}
