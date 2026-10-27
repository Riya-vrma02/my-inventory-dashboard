from data_preprocessing import preprocess_sales_csv

with open("sample_sales.csv", "rb") as file:
    cleaned_df, report = preprocess_sales_csv(file)

print("\nCLEANED DATA:")
print(cleaned_df)

print("\nPREPROCESSING REPORT:")
for key, value in report.items():
    print(f"{key}: {value}")