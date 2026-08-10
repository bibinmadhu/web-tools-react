export interface JavaPreset {
  id: string;
  name: string;
  description: string;
  category: 'springboot' | 'android' | 'dao' | 'stacktrace';
  code: string;
  sampleMapping?: Record<string, string>;
}

export const JAVA_PRESETS: JavaPreset[] = [
  {
    id: 'springboot-controller',
    name: 'Spring Boot REST Controller',
    description: 'REST Controller with Spring annotations, dependency injection & DTOs',
    category: 'springboot',
    code: `package com.acme.financial.controller;

import com.acme.financial.service.PaymentService;
import com.acme.financial.dto.PaymentRequest;
import com.acme.financial.dto.PaymentResponse;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @PostMapping("/process")
    public PaymentResponse processTransaction(@RequestBody PaymentRequest request) {
        String transactionId = "TXN_" + System.currentTimeMillis();
        double totalAmount = request.getAmount() * 1.05;
        boolean isApproved = paymentService.executePayment(request.getAccount(), totalAmount);
        return new PaymentResponse(transactionId, isApproved, "SUCCESS");
    }
}`,
  },
  {
    id: 'android-activity',
    name: 'Android Activity & ViewModel',
    description: 'Android activity with lifecycle methods, framework imports & session state',
    category: 'android',
    code: `package com.acme.mobile.app;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private String currentSessionToken;
    private int userRetryAttempts = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        this.currentSessionToken = "SECURE_SESSION_KEY_99812";
        this.userRetryAttempts = 1;
        fetchAccountDetails(currentSessionToken, userRetryAttempts);
    }

    private boolean fetchAccountDetails(String sessionToken, int attemptCount) {
        if (sessionToken != null && attemptCount < 5) {
            System.out.println("Fetching user profile for session: " + sessionToken);
            return true;
        }
        return false;
    }

    public String getCurrentSessionToken() {
        return currentSessionToken;
    }
}`,
  },
  {
    id: 'dao-repository',
    name: 'Data Access Repository & Main',
    description: 'Core Java DAO with list storage, getters/setters and main entry point',
    category: 'dao',
    code: `package com.enterprise.data.dao;

import java.util.List;
import java.util.ArrayList;

public class OrderRepository {

    private List<String> orderDatabase = new ArrayList<>();
    private int totalOrderCount = 0;

    public void saveOrder(String orderId, double price) {
        String formattedOrder = "ORDER#" + orderId + ":" + price;
        orderDatabase.add(formattedOrder);
        totalOrderCount++;
    }

    public int getTotalOrderCount() {
        return totalOrderCount;
    }

    public static void main(String[] args) {
        OrderRepository repository = new OrderRepository();
        repository.saveOrder("1001", 149.99);
        System.out.println("Orders saved: " + repository.getTotalOrderCount());
    }
}`,
  },
  {
    id: 'stack-trace-sample',
    name: 'Obfuscated Stack Trace (De-obfuscation test)',
    description: 'Sample obfuscated stack trace to test reversing via mapping dictionary',
    category: 'stacktrace',
    code: `java.lang.NullPointerException: Cannot invoke paymentService because it is null
    at com.a.a.A.a(A.java:24)
    at com.a.a.A.processTransaction(A.java:28)
    at com.a.b.B.b(B.java:102)
    at com.a.b.B.main(B.java:15)`,
    sampleMapping: {
      "com.a.a": "com.acme.financial.controller",
      "com.a.b": "com.acme.financial.service",
      "A": "PaymentController",
      "B": "PaymentService",
      "a": "executePayment",
      "b": "processTransaction"
    }
  }
];
