import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/admin_api_service.dart';
import '../theme/app_theme.dart';
import '../utils/api_utils.dart';

class ManageUsersScreen extends StatefulWidget {
  const ManageUsersScreen({super.key});

  @override
  State<ManageUsersScreen> createState() => _ManageUsersScreenState();
}

class _ManageUsersScreenState extends State<ManageUsersScreen> {
  bool _isLoading = true;
  List<dynamic> _users = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchUsers();
  }

  Future<void> _fetchUsers() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await AdminApiService.getUsers();
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        setState(() {
          _users = ApiUtils.extractList(decoded, 'users');
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load users';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Network error: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Manage Users'),
        backgroundColor: AppTheme.surface,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchUsers,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryLight))
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(_error!, style: const TextStyle(color: AppTheme.danger)),
                      const SizedBox(height: 16),
                      ElevatedButton(onPressed: _fetchUsers, child: const Text('Retry')),
                    ],
                  ),
                )
              : _users.isEmpty
                  ? const Center(
                      child: Text(
                        'No users found.',
                        style: TextStyle(color: AppTheme.muted, fontSize: 16),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _users.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final user = _users[index];
                        final name = user['name'] ?? user['full_name'] ?? 'Unknown User';
                        final email = user['email'] ?? 'No Email';
                        final role = user['role'] ?? 'student';
                        
                        return Container(
                          decoration: BoxDecoration(
                            color: AppTheme.surface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppTheme.border),
                          ),
                          child: ListTile(
                            contentPadding: const EdgeInsets.all(16),
                            leading: Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: role == 'admin' ? AppTheme.danger.withAlpha(36) : AppTheme.info.withAlpha(36),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                role == 'admin' ? Icons.admin_panel_settings_rounded : Icons.person_rounded,
                                color: role == 'admin' ? AppTheme.danger : AppTheme.info,
                              ),
                            ),
                            title: Text(
                              name,
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                            subtitle: Padding(
                              padding: const EdgeInsets.only(top: 4.0),
                              child: Text(
                                email,
                                style: const TextStyle(color: AppTheme.muted),
                              ),
                            ),
                            trailing: IconButton(
                              icon: const Icon(Icons.monetization_on, color: AppTheme.info),
                              onPressed: () {
                                _showGiveCreditsDialog(user);
                              },
                              tooltip: 'Give Credits',
                            ),
                            onTap: () {
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Manage user: $name')));
                            },
                          ),
                        );
                      },
                    ),
    );
  }

  void _showGiveCreditsDialog(dynamic user) {
    final name = user['name'] ?? user['full_name'] ?? 'Unknown User';
    final userId = user['id'];
    if (userId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('User ID not found'), backgroundColor: AppTheme.danger),
      );
      return;
    }
    int amount = 10;
    String creditType = 'self_study';
    String otp = '';
    bool otpSent = false;
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
                left: 24,
                right: 24,
                top: 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Give Credits to $name',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      keyboardType: TextInputType.number,
                      initialValue: amount.toString(),
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(
                        labelText: 'Amount',
                        labelStyle: TextStyle(color: AppTheme.muted),
                        enabledBorder: UnderlineInputBorder(
                          borderSide: BorderSide(color: AppTheme.border),
                        ),
                        focusedBorder: UnderlineInputBorder(
                          borderSide: BorderSide(color: AppTheme.primaryLight),
                        ),
                      ),
                      onChanged: (value) {
                        amount = int.tryParse(value) ?? 0;
                      },
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: creditType,
                      dropdownColor: AppTheme.surface,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(
                        labelText: 'Credit Type',
                        labelStyle: TextStyle(color: AppTheme.muted),
                        enabledBorder: UnderlineInputBorder(
                          borderSide: BorderSide(color: AppTheme.border),
                        ),
                        focusedBorder: UnderlineInputBorder(
                          borderSide: BorderSide(color: AppTheme.primaryLight),
                        ),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'self_study', child: Text('Self Study Credits')),
                        DropdownMenuItem(value: 'live_class', child: Text('Live Class Credits')),
                        DropdownMenuItem(value: 'ai', child: Text('AI Credits')),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setModalState(() {
                            creditType = value;
                          });
                        }
                      },
                    ),
                    const SizedBox(height: 24),
                    if (!otpSent)
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          onPressed: isSubmitting
                              ? null
                              : () async {
                                  if (amount <= 0) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Amount must be greater than 0')),
                                    );
                                    return;
                                  }
                                  setModalState(() {
                                    isSubmitting = true;
                                  });
                                  try {
                                    final res = await AdminApiService.sendOtp();
                                    if (res.statusCode == 200 || res.statusCode == 201) {
                                      setModalState(() {
                                        otpSent = true;
                                      });
                                      if (context.mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('OTP sent to admin email')),
                                        );
                                      }
                                    } else {
                                      if (context.mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('Failed to send OTP')),
                                        );
                                      }
                                    }
                                  } catch (e) {
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text('Error: $e')),
                                      );
                                    }
                                  } finally {
                                    setModalState(() {
                                      isSubmitting = false;
                                    });
                                  }
                                },
                          child: isSubmitting
                              ? const SizedBox(
                                  width: 24,
                                  height: 24,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                )
                              : const Text('Send OTP'),
                        ),
                      )
                    else ...[
                      TextField(
                        style: const TextStyle(color: Colors.white),
                        decoration: const InputDecoration(
                          labelText: 'Enter OTP',
                          labelStyle: TextStyle(color: AppTheme.muted),
                          enabledBorder: UnderlineInputBorder(
                            borderSide: BorderSide(color: AppTheme.border),
                          ),
                          focusedBorder: UnderlineInputBorder(
                            borderSide: BorderSide(color: AppTheme.primaryLight),
                          ),
                        ),
                        onChanged: (value) {
                          setModalState(() {
                            otp = value;
                          });
                        },
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          onPressed: (isSubmitting || otp.isEmpty)
                              ? null
                              : () async {
                                  if (amount <= 0) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Amount must be greater than 0')),
                                    );
                                    return;
                                  }
                                  setModalState(() {
                                    isSubmitting = true;
                                  });
                                  try {
                                    final res = await AdminApiService.giveCredits(
                                      userId,
                                      otp,
                                      amount,
                                      creditType,
                                    );
                                    if (res.statusCode == 200) {
                                      if (context.mounted) {
                                        Navigator.pop(context);
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('Credits added successfully')),
                                        );
                                        _fetchUsers();
                                      }
                                    } else {
                                      final data = jsonDecode(res.body);
                                      if (context.mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(content: Text(data['error'] ?? 'Failed to add credits')),
                                        );
                                      }
                                    }
                                  } catch (e) {
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text('Error: $e')),
                                      );
                                    }
                                  } finally {
                                    setModalState(() {
                                      isSubmitting = false;
                                    });
                                  }
                                },
                          child: isSubmitting
                              ? const SizedBox(
                                  width: 24,
                                  height: 24,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                )
                              : const Text('Give Credits'),
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}
