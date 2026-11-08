package com.example.workoutprogram.data

import com.sun.net.httpserver.HttpServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.IOException
import java.net.InetSocketAddress
import java.util.Base64

class WeekApiTest {
    private var status = 200
    private var method = ""
    private var path = ""
    private var contentType: String? = null
    private var authorization: String? = null
    private var body = ""
    private var responseBody: String? = null

    private val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0).apply {
        createContext("/") { exchange ->
            method = exchange.requestMethod
            path = exchange.requestURI.path
            contentType = exchange.requestHeaders.getFirst("Content-Type")
            authorization = exchange.requestHeaders.getFirst("Authorization")
            body = exchange.requestBody.readBytes().decodeToString()
            val response = responseBody?.toByteArray()
            exchange.sendResponseHeaders(status, response?.size?.toLong() ?: -1)
            response?.let { exchange.responseBody.write(it) }
            exchange.close()
        }
        start()
    }

    private val api = WeekApi("http://127.0.0.1:${server.address.port}", "me", "secret")

    @After
    fun stopServer() = server.stop(0)

    @Test
    fun saveProgress_putsTheJsonToTheWeek() {
        api.saveProgress("w9", """{"note":"Rūta"}""")

        assertEquals("PUT", method)
        assertEquals("/api/clients/me/weeks/w9/progress", path)
        assertEquals("application/json", contentType)
        assertEquals("""{"note":"Rūta"}""", body)
    }

    @Test
    fun saveProgress_sendsThePassword() {
        api.saveProgress("w9", "{}")

        val encoded = Base64.getEncoder().encodeToString("client:secret".toByteArray())
        assertEquals("Basic $encoded", authorization)
    }

    @Test
    fun saveProgress_dropsProgressForAWeekThatIsNoLongerCurrent() {
        status = 409

        api.saveProgress("old", "{}")
    }

    @Test(expected = IOException::class)
    fun saveProgress_failsWhenTheServerErrors() {
        status = 500

        api.saveProgress("w9", "{}")
    }

    @Test(expected = IOException::class)
    fun saveProgress_failsWhenThePasswordIsWrong() {
        status = 401

        api.saveProgress("w9", "{}")
    }

    @Test
    fun pastWeeks_getsTheClientsPastWeeks() {
        responseBody = "[]"

        assertEquals("[]", api.pastWeeks())
        assertEquals("GET", method)
        assertEquals("/api/clients/me/past-weeks", path)
    }

    @Test(expected = IOException::class)
    fun pastWeeks_failsWhenTheServerErrors() {
        status = 500

        api.pastWeeks()
    }
}
